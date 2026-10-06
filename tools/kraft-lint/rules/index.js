/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 *
 * The implemented rules.
 *
 * Each entry names a rule id from standards/standard.json and supplies a check. A check gets
 * one line and returns nothing, one finding, or an array of findings.
 *
 * A rule that cannot honestly be decided by reading text is not implemented here. It is listed
 * in coverage.js as MANUAL with a reason, and the selftest fails if a rule is in neither list.
 * That is the whole design: the gate's coverage is a number it publishes, not a claim it
 * makes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Helpers ───────────────────────────────────────────────────────────────────────────────

const kt = (r) => /\.kt$/i.test(r);

// Where a raw dp, sp or colour literal is the content of the file rather than a mistake in it.
// The token definitions and the theme schemes *are* raw values; requiring them to reference
// tokens would be circular. 85 of the 86 findings this gate reported against kraft-ui were
// inside KraftTokens.kt, which is what an unexamined exemption list looks like: /ui/theme/ was
// excluded and /ui/tokens/ was forgotten.
const IS_DEFINITION = /\/ui\/(theme|tokens)\//;
const isDefinition = (r) => IS_DEFINITION.test(r) || /KraftTokens\.kt$/.test(r);
const ktMain = (r) => kt(r) && r.includes('/src/main/');

/** Kotlin string literal, single or double quoted, non-greedy to the closing quote. */
const STR = `(?:"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"|'([^']*)')`;

function unquote(s) {
  if (s === undefined) return '';
  return s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

/**
 * Walks the source for raw dp / sp literals and reports each on its own line.
 *
 * A literal followed by `.toPx()` is skipped. That is a Compose draw dimension — a stroke
 * width, a corner radius in a Canvas — and there is no spacing token for it. An earlier
 * version tried to exempt these by filename, exempting `Canvas.kt`, which caught almost
 * nothing: krafttools keeps them in LevelScale.kt, Angle.kt, Compass.kt and SpeedGauge.kt, and
 * produced 60 findings a reviewer could only waive one at a time. Matching the construct
 * rather than the filename gets all of them, in every file, including the ones written next
 * year.
 */
function literals(raw, unit) {
  const re = new RegExp(`(?<![\\w.])([0-9]+(?:\\.[0-9]+)?)\\.${unit}\\b(\\.toPx\\(\\))?`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m[2]) continue;                       // a pixel conversion, not a spacing decision
    out.push({ value: parseFloat(m[1]), text: m[0], at: m.index });
  }
  return out;
}

// ── Shared visual language ────────────────────────────────────────────────────────────────

const spacing = [
  {
    id: 'spacing.no-raw-dp',
    // Exempt the files where dp is geometry rather than spacing. Canvas draw scopes convert
    // dp to pixels for stroke widths and corner radii; there is no spacing token for those
    // and pretending otherwise produces hundreds of false positives, which is how a gate
    // gets switched off.
    exempt: (r) => isDefinition(r) || /\/ui\/ColorPicker\.kt$/.test(r),
    check: ({ raw }) => literals(raw, 'dp').map((l) => ({
      message: `${l.text} is a raw dp value. Use a KraftSpacing token, or waive it with a reason if it is a component metric rather than spacing.`,
    })),
  },
  {
    id: 'spacing.rhythm',
    exempt: (r) => isDefinition(r),
    check: ({ raw }) => {
      const allowed = new Set([0, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64]);
      return literals(raw, 'dp')
        .filter((l) => !allowed.has(l.value))
        .map((l) => ({
          message: `${l.text} is not on the 8px rhythm. Allowed: ${[...allowed].join(', ')} dp.`,
        }));
    },
  },
  {
    id: 'type.no-raw-sp',
    exempt: (r) => isDefinition(r),
    check: ({ raw }) => literals(raw, 'sp').map((l) => ({
      message: `${l.text} is a raw sp value. Type comes from KraftTypeScale via MaterialTheme.typography.`,
    })),
  },
  {
    id: 'radius.from-token',
    exempt: (r) => isDefinition(r),
    check: ({ raw }) => {
      const allowed = new Set([2.5, 4, 8, 12, 14, 16, 20, 28, 50]);
      const re = new RegExp(`RoundedCornerShape\\(([^)]*)\\)`, 'g');
      const out = [];
      let m;
      while ((m = re.exec(raw)) !== null) {
        for (const l of literals(m[1], 'dp')) {
          if (!allowed.has(l.value)) {
            out.push({ message: `RoundedCornerShape(${l.text}) is not on the radius scale. Allowed: ${[...allowed].join(', ')} dp.` });
          }
        }
      }
      return out;
    },
  },
  {
    id: 'colour.per-app-declared',
    exempt: (r) => isDefinition(r) || /\/ui\/ColorPicker\.kt$/.test(r),
    check: ({ raw }) => {
      const re = new RegExp(`Color\\(0x[0-9A-Fa-f]{8}\\)`, 'g');
      const out = [];
      let m;
      while ((m = re.exec(raw)) !== null) {
        out.push({ message: `${m[0]} is a colour literal outside the app's palette file. Declare it in the palette, once, with a reason.` });
      }
      return out;
    },
  },
  {
    id: 'tokens.no-duplicate-palette',
    exempt: () => false,
    severityOverride: 'warn',
    // Only fires when run against the portfolio, because it needs to see the other apps.
    portfolioOnly: true,
    check: () => [],
  },
];

// ── Architecture ──────────────────────────────────────────────────────────────────────────

const architecture = [
  {
    id: 'arch.domain-pure',
    appliesTo: (r) => ktMain(r) && /\/domain\//.test(r),
    check: ({ raw, line }) => {
      const bad = [];
      if (/^\s*import\s+(android|androidx)\./m.test(raw)) {
        const imp = raw.split('\n').find((l) => /^\s*import\s+(android|androidx)\./.test(l));
        bad.push({ line, message: `domain must be pure Kotlin: ${imp.trim()}` });
      }
      if (/^\s*import\s+androidx\.compose/m.test(raw)) {
        bad.push({ line, message: 'domain must not import Compose.' });
      }
      return bad;
    },
  },
  {
    id: 'arch.result-not-exception',
    appliesTo: (r) => ktMain(r) && /\/domain\//.test(r),
    check: ({ raw, line }) => {
      const out = [];
      const re = /throw\s+(IllegalStateException|IllegalArgumentException)/g;
      let m;
      while ((m = re.exec(raw)) !== null) {
        out.push({ message: `expected failure thrown as ${m[1]}. Use KraftResult.` });
      }
      return out;
    },
  },
  {
    id: 'arch.no-global-mutable-state',
    appliesTo: (r) => ktMain(r) && kt(r),
    // A top-level `var` outside a function body. Indentation of zero is the signal: a `var`
    // inside a class or function is indented, a top-level property is not.
    check: ({ raw, line }) => {
      const out = [];
      raw.split('\n').forEach((l, idx) => {
        if (/^var\s+\w/.test(l) && !/^\s/.test(l)) {
          out.push({ line: idx + 1, message: `top-level mutable state: ${l.trim().slice(0, 80)}` });
        }
      });
      return out;
    },
  },
  {
    id: 'type.m3-wrapper-present',
    perFile: true,
    appliesTo: (r) => ktMain(r) && /MainActivity\.kt$/.test(r),
    check: ({ raw, line }) => {
      if (/MaterialTheme\s*\(/.test(raw)) return [];
      if (/setContent/.test(raw)) {
        return [{ line, message: 'no MaterialTheme wrapper. Every MaterialTheme.colorScheme and typography reference below this will silently resolve to Material defaults.' }];
      }
      return [];
    },
  },
  {
    id: 'type.scale-declared',
    perFile: true,
    appliesTo: (r) => ktMain(r) && /Theme\.kt$/.test(r),
    check: ({ raw, line }) => {
      // A bare Typography() means the stock Material scale, which is what englishkraft and
      // pulsekraft do — the two apps that do not look like Kraft apps.
      const out = [];
      raw.split('\n').forEach((l, idx) => {
        if (/typography\s*=\s*Typography\(\s*\)/.test(l)) {
          out.push({ line: idx + 1, message: 'stock Typography(): this app inherits the Material type scale, not the Kraft one.' });
        }
      });
      return out;
    },
  },
];

// ── Privacy ───────────────────────────────────────────────────────────────────────────────

const privacy = [
  {
    id: 'privacy.no-hardcoded-secrets',
    docs: true,
    perFile: true,
    appliesTo: (r) => /\.(kt|kts|properties|xml|json|md)$/i.test(r),
    check: ({ raw }) => {
      const out = [];
      const patterns = [
        [/ghp_[A-Za-z0-9]{30,}/, 'a GitHub token'],
        [/github_pat_[A-Za-z0-9_]{30,}/, 'a GitHub fine-grained token'],
        [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
        [/\bAKIA[0-9A-Z]{16}\b/, 'an AWS access key id'],
        [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'a Slack token'],
        [/\bAIza[0-9A-Za-z_-]{30,}/, 'a Google API key'],
        [/(password|passwd|secret|api[_-]?key)\s*[:=]\s*["'][^"'\s]{8,}["']/i, 'a credential assigned a literal'],
      ];
      for (const [re, what] of patterns) {
        if (re.test(raw)) out.push({ message: `possible ${what} in source.` });
      }
      return out;
    },
  },
  {
    id: 'privacy.no-telemetry',
    docs: true,
    perFile: true,
    appliesTo: (r) => /build\.gradle\.kts$/.test(r) || /libs\.versions\.toml$/.test(r),
    check: ({ raw }) => {
      const banned = ['firebase', 'analytics', 'appcenter', 'crashlytics', 'amplitude', 'mixpanel',
        'segment', 'adjust', 'facebook', 'admob', 'applovin', 'bugsnag', 'sentry'];
      const out = [];
      for (const b of banned) {
        if (new RegExp(`["']com\\.[^"']*${b}[^"']*["']`, 'i').test(raw)) {
          out.push({ message: `telemetry or advertising dependency containing "${b}".` });
        }
      }
      return out;
    },
  },
  {
    id: 'privacy.permission-justified',
    perFile: true,
    appliesTo: (r) => /AndroidManifest\.xml$/.test(r),
    check: ({ text, file }) => {
      const out = [];
      const lines = text.split('\n');
      lines.forEach((l, idx) => {
        if (!/uses-permission/.test(l)) return;
        // The declaration may wrap across lines; look back for a comment.
        let j = idx - 1;
        let reason = null;
        while (j >= 0 && j > idx - 4) {
          if (/<!--/.test(lines[j])) { reason = lines.slice(j, idx + 1).join(' '); break; }
          j--;
        }
        if (!reason) {
          out.push({
            line: idx + 1,
            message: 'permission with no stated reason. Add a comment saying why this app needs it.',
          });
        }
      });
      return out;
    },
  },
  {
    id: 'privacy.no-network-when-offline',
    docs: true,
    perFile: true,
    appliesTo: (r) => /AndroidManifest\.xml$/.test(r) || /(^|\/)README\.md$/.test(r),
    check: ({ text, file }) => {
      const claimsOffline = /\boffline\b/i.test(text) || /\bno network\b/i.test(text);
      const hasInternet = /permission\.INTERNET/.test(text);
      if (claimsOffline && hasInternet) {
        return [{ message: 'this file claims offline operation and declares INTERNET. One of the two is wrong.' }];
      }
      return [];
    },
  },
];

// ── Build, quality, docs ──────────────────────────────────────────────────────────────────

const build = [
  {
    id: 'build.uses-shared-library',
    appliesTo: () => false,
    repo: ({ files, rel, add }) => {
      const settings = files.find((f) => /(^|\/)settings\.gradle(\.kts)?$/.test(rel(f)));
      if (!settings) return [];
      let text = '';
      try { text = fs.readFileSync(settings, 'utf8'); } catch { return []; }
      if (/includeBuild\s*\(/.test(text) && /kraft-foundation|kraft-ui/.test(text)) return [];
      // The foundation cannot consume itself. Its own settings file has no includeBuild, and
      // reporting that made the standard's own repository fail its own gate, which is either
      // an exemption or a lie, and an exemption is cheaper than a lie.
      const isFoundation = files.some((f) => rel(f).startsWith('kraft-ui/') && /\.kt$/.test(rel(f)));
      if (isFoundation) return [];
      add('build.uses-shared-library', rel(settings), 0,
        'this app does not consume the shared foundation. That is why it can look like a different product.');
      return [];
    },
  },
  {
    id: 'build.library-has-tests',
    appliesTo: () => false, // repo-level, handled below
    repo: ({ files, rel, add }) => {
      // Only meaningful when the foundation itself is what is being checked. Hard-coding the
      // module names made this fire on all nine apps — a finding no app can act on, because an
      // app consumes kraft-ui as a dependency and has no such directory to add tests to. A
      // finding nobody can fix is not a finding, it is noise with a severity attached.
      const present = ['kraft-ui', 'kraft-core'].filter((m) =>
        files.some((f) => rel(f) === m || rel(f).startsWith(`${m}/`))
      );
      for (const m of present) {
        const hasTests = files.some((f) => rel(f).startsWith(`${m}/src/test/`) && /\.kt$/i.test(rel(f)));
        if (!hasTests) {
          add('build.library-has-tests', `${m}/src/`, 0,
            `${m} has no tests. Rule 3 of the foundation's own rules: "Foundation carries its own tests."`);
        }
      }
      return [];
    },
  },
  {
    id: 'build.library-no-app-logic',
    appliesTo: (r) => /^kraft-(ui|core)\/src\/main\//.test(r) && kt(r),
    check: ({ raw }) => {
      const banned = ['SearchCache', 'RateLimit', 'GridPrefetch', 'MaxDecode', 'Wallhaven', 'Glance'];
      const out = [];
      for (const b of banned) {
        if (new RegExp(`^\\s*(?:const\\s+)?val\\s+${b}`, 'm').test(raw)) {
          out.push({ message: `${b} is app logic and does not belong in the shared library.` });
        }
      }
      return out;
    },
  },
];

const quality = [
  {
    id: 'quality.tests-exist',
    appliesTo: () => false,
    repo: ({ files, rel, add }) => {
      const domains = new Set();
      const tested = new Set();
      for (const f of files) {
        const r = rel(f);
        const d = r.match(/src\/main\/java\/[^/]+\/[^/]+\/([^/]+)\/domain\//);
        if (d) domains.add(d[1]);
        const t = r.match(/src\/test\/java\/[^/]+\/[^/]+\/([^/]+)\/domain\//);
        if (t) tested.add(t[1]);
      }
      for (const d of domains) {
        if (!tested.has(d)) {
          add('quality.tests-exist', 'src/', 0, `domain package "${d}" has no corresponding test package.`);
        }
      }
      return [];
    },
  },
  {
    id: 'quality.ci-runs-the-gate',
    perFile: true,
    appliesTo: (r) => /^\.github\/workflows\//.test(r),
    // Repo-level in effect but easy per-file: no workflow mentions the gate.
    check: ({ raw }) => (raw.includes('kraft-lint') ? [] : [{ message: 'this workflow does not run kraft-lint.' }]),
  },
  {
    id: 'quality.ci-runs-tests',
    perFile: true,
    appliesTo: (r) => /^\.github\/workflows\//.test(r),
    check: ({ raw }) => (raw.includes('testDebugUnitTest') || raw.includes('gradlew test') ? [] : [{ message: 'this workflow does not run the unit tests.' }]),
  },
  {
    id: 'quality.toolchain-uniform',
    appliesTo: (r) => /gradle-wrapper\.properties$/.test(r),
    severityOverride: 'warn',
    check: ({ raw }) => {
      const m = /gradle-(\d+)\.(\d+)/.exec(raw);
      if (!m) return [];
      const major = Number(m[1]);
      // Recorded, not enforced. Two apps are a major version behind and that is a finding to
      // discuss, not a build failure — until every app is on one version there is nothing to
      // enforce against.
      return [{ severity: 'warn', message: `Gradle ${m[1]}.${m[2]} (major ${major}). The portfolio mode is 9.x.` }];
    },
  },
];

const docs = [
  {
    id: 'docs.standards-present',
    docs: true,
    appliesTo: (r) => /(^|\/)README\.md$/.test(r),
    check: ({ text }) => {
      if (/kraft-foundation|kraft-ui/i.test(text)) return [];
      return [{ message: 'the README does not reference the foundation or the version of the standard this app targets.' }];
    },
  },
];

module.exports = [
  ...spacing,
  ...architecture,
  ...privacy,
  ...build,
  ...quality,
  ...docs,
];