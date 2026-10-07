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

/**
 * A file whose content *is* the numbers — an object holding only dp/sp vals and the comments
 * explaining them. gitakraft's GitaMetrics and langkraft's LangMetrics are both this shape,
 * but only the first sits under ui/theme/, so the path exemption caught one and reported the
 * other. Asking what the file contains rather than where it lives catches both, and any
 * future metrics file wherever an app puts it.
 *
 * Deliberately narrow: an `object` holding only dp/sp vals, no composables, no functions. A
 * screen that happens to declare file-private constants does not qualify — top-level vals
 * outside an object are exactly what the rule should flag, since they should reference
 * tokens rather than restate numbers. The first version of this check omitted the object
 * requirement and exempted any file of bare vals, which is most fixtures and some screens.
 */
function isMetricsFile(text) {
  if (/@Composable|\bfun\s+\w/.test(text)) return false;
  if (!/\bobject\s+\w+/.test(text)) return false;
  const vals = [...text.matchAll(/^\s*(?:private\s+|public\s+|internal\s+)?val\s+\w+\s*=\s*(.+)$/gm)];
  if (!vals.length) return false;
  return vals.every(([, v]) => /^[0-9.]+\.(dp|sp)\s*$/.test(v.trim()));
}

/**
 * Zero is not spacing, it is the absence of spacing, and it has no token to point at.
 *
 * gitakraft's LiquidGlass carried five `0.dp`: a default `elevation: Dp = 0.dp`, a
 * `RoundedCornerShape(0.dp)` meaning "rectangle", and a comparison testing whether a shape is
 * that rectangle. Not one was a spacing decision, and asking for a token for "no padding"
 * would mean inventing `KraftSpacing.None`.
 */
const notAbsent = (l) => l.value !== 0;

/**
 * Does this app consume the foundation as a composite build?
 *
 * Two questions need this, and both are the same mistake: a name that the rule cannot resolve
 * in the app's own source may well be defined in kraft-ui, and reporting it would tell an app
 * to inline something it is supposed to be sharing.
 */
function consumesFoundation(files, rel, readText) {
  const settings = files.find((f) => /(^|\/)settings\.gradle(\.kts)?$/.test(rel(f)));
  if (!settings) return false;
  const text = readText(settings);
  if (!text) return false;
  return /includeBuild\s*\(/.test(text) && /kraft-foundation|kraft-ui/.test(text);
}
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
    exempt: (r, text) =>
      isDefinition(r) ||
      /\/ui\/ColorPicker\.kt$/.test(r) ||
      (typeof text === 'string' && isMetricsFile(text)),
    check: ({ raw }) => literals(raw, 'dp').filter(notAbsent).map((l) => ({
      message: `${l.text} is a raw dp value. Use a KraftSpacing token, or waive it with a reason if it is a component metric rather than spacing.`,
    })),
  },
  {
    id: 'spacing.rhythm',
    exempt: (r, text) => isDefinition(r) || (typeof text === 'string' && isMetricsFile(text)),
    check: ({ raw }) => {
      const allowed = new Set([0, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64]);
      return literals(raw, 'dp')
        .filter(notAbsent)
        .filter((l) => !allowed.has(l.value))
        .map((l) => ({
          message: `${l.text} is not on the 8px rhythm. Allowed: ${[...allowed].join(', ')} dp.`,
        }));
    },
  },
  {
    id: 'type.no-raw-sp',
    // A file that constructs a Typography is where type values are defined, wherever it lives.
    // Same principle as the colour exemption: langkraft keeps its scale in ui/Theme.kt rather
    // than ui/theme/, and the path-based exemption reported 14 findings in the file that
    // defines the app's type. A file calling Typography( *is* the type definition.
    exempt: (r, text) =>
      isDefinition(r) ||
      (typeof text === 'string' && /\bTypography\s*\(/.test(text)),
    check: ({ raw }) => literals(raw, 'sp').map((l) => ({
      message: `${l.text} is a raw sp value. Type comes from KraftTypeScale via MaterialTheme.typography.`,
    })),
  },
  {
    id: 'radius.from-token',
    exempt: (r, text) => isDefinition(r) || (typeof text === 'string' && isMetricsFile(text)),
    check: ({ raw }) => {
      // 0 is on the scale and always has been: `RoundedCornerShape(0.dp)` is how you say "no
      // rounding", and a shape is frequently square at one end of a range it animates between.
      // Omitting it produced three findings in gitakraft's LiquidGlass, where a corner that
      // interpolates to square is named 0.dp.
      const allowed = new Set([0, 2.5, 4, 8, 12, 14, 16, 20, 28, 50]);
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
    // A palette is a file that builds a colour scheme, wherever it lives.
    //
    // The exemption used to be the path `ui/theme/**`, which is where the foundation and
    // gitakraft keep theirs. englishkraft and langkraft keep theirs in `ui/Theme.kt`, and the
    // rule reported 21 and 36 findings in two files that are each a single app's complete
    // palette — telling an app that had done exactly the right thing that it had not.
    //
    // Recognising the construct rather than the location is what the rule actually means.
    // A file that calls darkColorScheme( or lightColorScheme( *is* the palette; a colour
    // literal in a screen is not, and still is a finding — gitakraft's SettingsScreen had
    // seven and keeps all seven.
    exempt: (r, text) =>
      isDefinition(r) ||
      /\/ui\/ColorPicker\.kt$/.test(r) ||
      (typeof text === 'string' && /\b(?:darkColorScheme|lightColorScheme)\s*\(/.test(text)),
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
    appliesTo: () => false,
    // Asked of the whole app, not of MainActivity.
    //
    // The defect is real and it shipped: barokraft has no theme composable anywhere, so every
    // MaterialTheme.colorScheme and typography reference in it resolves to Material's own
    // defaults and the app is inconsistent with itself without anything reporting it.
    //
    // Two narrower versions of this rule were wrong first. Accepting only the literal name
    // MaterialTheme( flagged every app that correctly supplies its own theme — which is how
    // the accent is per-app, and the reason this foundation exists in a per-app scope at all.
    // Accepting any *Theme( call *in MainActivity* flagged englishkraft and wallkraft, whose
    // MainActivity calls EnglishKraftApp(...) and applies the theme one frame deeper.
    // MainActivity is not the only place a wrapper can be entered from, so asking it was
    // asking the wrong question.
    //
    // What is left is the part decidable from source, and the part that actually separates the
    // one broken app from the eight working ones: does a theme composable exist at all. It
    // will not catch an app that defines a theme and forgets to call it — which is visible in
    // review, and a far milder failure than having no theme to call.
    //
    // A theme may also be used without being defined: trainkraft calls the foundation's
    // `KraftTheme(darkTheme = true)` directly and defines nothing of its own, which is the
    // ideal end state rather than a violation. The rule accepts either.
    repo: ({ files, rel, readText, add }) => {
      const inMain = (f) => /\/src\/main\//.test(rel(f)) && /\.kt$/i.test(rel(f));
      const definesTheme = files.some((f) => {
        if (!inMain(f)) return false;
        const t = readText(f);
        return t !== null && /fun\s+[A-Z]\w*Theme\s*\(/.test(t);
      });
      if (definesTheme) return [];
      const usesTheme = files.some((f) => {
        if (!inMain(f)) return false;
        const t = readText(f);
        return t !== null && /\b[A-Z]\w*Theme\s*\(/.test(t);
      });
      if (usesTheme) return [];
      add('type.m3-wrapper-present', 'app/src/main/', 0,
        'no theme composable anywhere in main source. Every MaterialTheme.colorScheme and ' +
        'typography reference in this app resolves to Material defaults, and the app is ' +
        'inconsistent with itself without reporting it.');
      return [];
    },
  },
  {
    id: 'type.scale-declared',
    appliesTo: () => false,
    // Asked of the whole app, because the question spans files: the theme composable names a
    // Typography, and that Typography is defined somewhere else.
    //
    // The defect this exists for is englishkraft's, and the earlier version of this rule could
    // not see it. englishkraft's theme is
    //
    //     MaterialTheme(colorScheme = KraftDark, content = content)
    //
    // — no typography argument at all. MaterialTheme falls back to the stock Material scale, so
    // the app renders in Roboto's proportions rather than the Kraft type scale, and it passed a
    // rule whose entire purpose was to catch that. Omitting the argument is a worse defect than
    // passing the wrong one, because `Typography()` at least shows up when you read the file.
    //
    // Three cases, in order:
    //   1. no `typography =` at all — silent fallback to the stock scale
    //   2. `Typography()` — the stock scale, explicitly
    //   3. a named Typography not built from KraftTypeScale — a scale of its own, which is
    //      allowed, but only if it says so
    repo: ({ files, rel, readText, add }) => {
      const sources = files.filter((f) => /\/src\/main\//.test(rel(f)) && /\.kt$/i.test(rel(f)));
      const contents = new Map();
      for (const f of sources) {
        const t = readText(f);
        if (t) contents.set(rel(f), t);
      }

      for (const [file, text] of contents) {
        if (!/fun\s+[A-Z]\w*Theme\s*\(/.test(text)) continue;

        if (!/typography\s*=/.test(text)) {
          add('type.scale-declared', file, 0,
            'the theme composable passes no typography. MaterialTheme falls back to the stock ' +
            'Material scale, so every MaterialTheme.typography.* in this app is Roboto ' +
            'proportions rather than the Kraft scale, and nothing reports it.');
          continue;
        }

        if (/typography\s*=\s*Typography\s*\(\s*\)/.test(text)) {
          add('type.scale-declared', file, 0,
            'stock Typography(): this app inherits the Material type scale, not the Kraft one.');
          continue;
        }

        const named = /typography\s*=\s*([A-Za-z]\w*(?:\s*\.\s*\w+)?)/.exec(text);
        if (!named) continue;
        const name = named[1].replace(/\s+/g, '');

        // The reference may be qualified — wallkraft writes `KraftTypography.Typography` and
        // holding the scale in an object is the natural way to do it. The lookup uses the
        // property name, which resolves both shapes:
        //     typography = XTypography            val XTypography = Typography(...)
        //     typography = XType.Scale            object XType { val Scale = Typography(...) }
        //
        // An earlier version also allowed the *definition* to be written `Object.prop = ...`,
        // which is not a thing Kotlin can express. It could not be exercised by any fixture,
        // and two attempts to make a test for it passed with the clause deleted — a check that
        // cannot fail is not coverage, so the clause is gone.
        const prop = name.includes('.') ? name.split('.').pop() : name;
        const decl = new RegExp('\\b' + prop + '\\s*(?::[^=]+)?=\\s*Typography\\s*\\(');
        let defFile = null;
        let defText = null;
        for (const [f, t] of contents) {
          if (decl.test(t)) { defFile = f; defText = t; break; }
        }
        if (!defText) {
          // It may be defined in the foundation, which is where a shared scale belongs.
          // wallkraft asks for `KraftTypography` and gets it from kraft-ui, and reporting that
          // would be the rule telling an app to inline a scale it is supposed to be sharing —
          // the exact opposite of what it is for. Only apps that consume the foundation get
          // this exit; for anything else an unresolved name is worth a finding, because it
          // would not compile anyway and this is where that surfaces first.
          if (consumesFoundation(files, rel, readText)) continue;
          add('type.scale-declared', file, 0,
            'typography = ' + name + ', but nothing in main source defines ' + name +
            ' as a Typography. This rule cannot verify it, so it is reported rather than assumed.');
          continue;
        }
        if (!/KraftTypeScale/.test(defText)) {
          add('type.scale-declared', defFile, 0,
            name + ' is a type scale that does not reference KraftTypeScale. An app may keep its ' +
            'own scale, but only by saying why; if this was meant to be the shared scale, build ' +
            'it from the tokens instead of restating the numbers.');
        }
      }
      return [];
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
    check: ({ raw, file }) => {
      const out = [];
      // Token formats stay active everywhere, including tests: a pasted `ghp_` string is a
      // real credential no matter which source set it sits in.
      const patterns = [
        [/ghp_[A-Za-z0-9]{30,}/, 'a GitHub token'],
        [/github_pat_[A-Za-z0-9_]{30,}/, 'a GitHub fine-grained token'],
        [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
        [/\bAKIA[0-9A-Z]{16}\b/, 'an AWS access key id'],
        [/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'a Slack token'],
        [/\bAIza[0-9A-Za-z_-]{30,}/, 'a Google API key'],
      ];
      // The generic `password = "literal"` heuristic skips test sources. Test fixtures
      // assign obviously-fake credentials (`apiKey = "existing-key"`) as a matter of course,
      // and flagging those teaches people the secret rule cries wolf — after which a real
      // finding goes unread with the false ones. wallkraft's SettingsViewModelTest was the
      // proof: flagged for a fixture, on every run, with no way to be clean.
      if (!/\/src\/test\//.test(file || '')) {
        patterns.push([/(password|passwd|secret|api[_-]?key)\s*[:=]\s*["'][^"'\s]{8,}["']/i, 'a credential assigned a literal']);
      }
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

        // A removal directive is not a request — `tools:node="remove"` strips a permission a
        // library's manifest merged in. englishkraft's manifest carries one for
        // DYNAMIC_RECEIVER_NOT_EXPORTED, an androidx.core permission for a receiver the app
        // never registers. Flagging a removal as an unjustified permission would be the rule
        // demanding a reason for the absence of a thing.
        //
        // The attribute may sit on the next line — `<uses-permission` opens the element and
        // `tools:node="remove"` closes it — so the element's own span is checked, not the
        // single line. An earlier version tested the line first and only then the span, which
        // meant a wrapped element fell through to the comment search and was reported for
        // having no reason.
        const span = [l, lines[idx + 1] || '', lines[idx + 2] || ''].join(' ');
        if (/tools:node\s*=\s*"remove"/.test(span)) return;

        // The declaration may wrap across lines; look back for a comment. Further back than
        // feels necessary, because the comment may sit above a sibling element — englishkraft's
        // justification covers both the <permission> and the <uses-permission>, and the two are
        // separated by eleven lines of XML.
        let j = idx - 1;
        let reason = null;
        while (j >= 0 && j > idx - 14) {
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
        // An app may be offline apart from one declared exception. gitakraft is exactly that:
        // "No accounts. No ads. No tracking. Fully offline. The internet permission exists for
        // one thing only: an update check you trigger." That is a stronger privacy position
        // than an app with no INTERNET permission at all, and this rule was calling it a
        // contradiction.
        //
        // Accepted only where the exception is stated — a comment above the permission in the
        // manifest, or a sentence naming it. Silence is still a finding, because an
        // unexplained INTERNET permission is the thing worth catching.
        const declared =
          /<!--[^>]*(network|internet|update|sync|fetch|download|connect)[^>]*-->/i.test(text) ||
          /\bpermission exists for\b/i.test(text) ||
          /\b(offline|no network)[^.]*\bexcept\b[^.]*\./i.test(text) ||
          /\b(offline|no network)[^.]*\b(one thing only|single|only for)\b/i.test(text);
        if (declared) return [];
        return [{ message: 'this file claims offline operation and declares INTERNET with no stated exception. Either drop the permission or say, in this file, what it is for.' }];
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
    repo: ({ files, rel, readText, add }) => {
      // The app's settings file, not just any settings file. The gate walks the whole tree it
      // is pointed at, and when that tree holds the app beside its foundation checkout, the
      // foundation's own settings.gradle.kts is in the walk too. find() returned whichever
      // came first in directory order — the foundation's — which has no includeBuild, so an
      // app that consumed the foundation correctly was reported as not consuming it.
      // langkraft's first CI run failed on exactly this: 170 milliseconds, two findings,
      // both wrong.
      const settings =
        files.find((f) => rel(f) === 'settings.gradle.kts' || rel(f) === 'settings.gradle') ||
        files.find((f) => /(^|\/)settings\.gradle(\.kts)?$/.test(rel(f)));
      if (!settings) return [];
      let text = '';
      try { text = readText(settings); } catch { return []; }
      if (!text) return [];
      if (/includeBuild\s*\(/.test(text) && /kraft-foundation|kraft-ui/.test(text)) return [];
      // The foundation cannot consume itself. Its own settings file has no includeBuild, and
      // reporting that made the standard's own repository fail its own gate, which is either
      // an exemption or a lie, and an exemption is cheaper than a lie. Matched at any depth,
      // because the foundation may be the tree being scanned or a sibling inside it.
      const isFoundation = files.some((f) => /(^|\/)kraft-(ui|core)\/src\/main\//.test(rel(f)));
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
    perFile: true,
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