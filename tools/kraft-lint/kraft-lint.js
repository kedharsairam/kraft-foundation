#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 *
 * kraft-lint — checks an app against standards/standard.json.
 *
 * Zero dependencies, on purpose. This runs on every commit in every app in the portfolio,
 * and a gate that needs a package install is a gate that silently stops running the first
 * time a runner's cache is cold. Node and the standard library are all it uses.
 *
 * Usage
 *   kraft-lint [appDir] [--standard <path>] [--format text|json|github] [--quiet]
 *              [--list-rules] [--selftest]
 *
 * Exit codes
 *   0  no error-severity findings
 *   1  at least one error-severity finding
 *   2  the linter could not run: no standard, unreadable app, or a broken waiver
 *
 * Honesty about coverage
 * ----------------------
 * Not every rule in standard.json can be decided by reading source text, and this tool does
 * not pretend otherwise. A rule is either implemented here or listed in MANUAL with a reason.
 * `--selftest` fails if a rule is neither. The summary line reports the ratio, because a gate
 * that claims to check twenty-nine rules when it checks twenty is worse than one that counts.
 *
 * Waivers
 * -------
 *     .padding(6.dp) // @kraft-lint-ignore spacing.no-raw-dp — optical nudge, see PR 412
 *
 * A waiver without a rule id is ignored. A waiver without a reason after the dash is itself an
 * error-severity finding, because an unexplained exception is indistinguishable from a bug and
 * the whole purpose of this is to make exceptions visible.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const RULES = require('./rules');
const { MANUAL, COVERAGE } = require('./rules/coverage');

// ── Output ────────────────────────────────────────────────────────────────────────────────

const RESET = '[0m';
const colour = (code, s) => (process.stdout.isTTY ? `[${code}m${s}${RESET}` : s);
const red = (s) => colour('31', s);
const yellow = (s) => colour('33', s);
const blue = (s) => colour('34', s);
const grey = (s) => colour('90', s);

// GitHub Actions annotation format, so a finding is clickable in the pull request rather
// than a wall of text in the log.
function githubAnnotation(f) {
  const line = f.file ? ` file=${f.file},line=${f.line}` : '';
  return `::${f.severity === 'error' ? 'error' : f.severity === 'warn' ? 'warning' : 'notice'} title=${f.rule}${line}::${f.message}`;
}

// ── Reading the standard ──────────────────────────────────────────────────────────────────

function loadStandard(explicit) {
  const candidates = explicit
    ? [explicit]
    : [
      // The app being checked, if it vendors the standard.
      path.join(process.cwd(), 'standards', 'standard.json'),
      // A sibling checkout of the foundation, which is how a CI runner will have it.
      path.join(process.cwd(), '..', 'kraft-foundation', 'standards', 'standard.json'),
      path.join(__dirname, '..', '..', 'standards', 'standard.json'),
    ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        return { standard: JSON.parse(fs.readFileSync(c, 'utf8')), path: c };
      } catch (e) {
        throw new Error(`${c} is not valid JSON: ${e.message}`);
      }
    }
  }
  throw new Error(
    'no standard found. Looked in:\n  ' + candidates.map((c) => `  ${c}`).join('\n  ') +
    '\nPass --standard <path>, or vendor the foundation next to the app.'
  );
}

// ── Walking an app ────────────────────────────────────────────────────────────────────────

const SKIP_DIRS = new Set([
  'build', '.git', '.gradle', '.idea', 'node_modules', '.kotlin', 'captures', 'outputs',
]);

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.github') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, out);
    } else if (e.isFile()) {
      out.push(full);
    }
  }
  return out;
}

// ── Waivers ───────────────────────────────────────────────────────────────────────────────

const WAIVER = /@kraft-lint-ignore\s+([a-z0-9.\-]+)\s*(?:—|--|-)?\s*(.*)$/;

/**
 * Finds waivers on a line and reports any that are malformed.
 * @returns {{rules: Set<string>, problems: Array}}
 */
function waiversOn(line) {
  const rules = new Set();
  const problems = [];
  // A bare mention with no rule id is not a waiver, it is a stray comment. But a line that
  // clearly intends to waive and forgets the id is a mistake worth surfacing.
  if (line.includes('@kraft-lint-ignore') && !WAIVER.test(line)) {
    problems.push({
      rule: 'waiver.malformed',
      severity: 'error',
      message: 'a waiver needs a rule id, e.g. "@kraft-lint-ignore spacing.no-raw-dp — reason"',
    });
  }
  let m = WAIVER.exec(line);
  while (m) {
    rules.add(m[1]);
    const reason = (m[2] || '').trim();
    if (!reason) {
      problems.push({
        rule: 'waiver.no-reason',
        severity: 'error',
        message: `waiver for "${m[1]}" has no reason. An unexplained exception is ` +
          'indistinguishable from a bug, and this is the thing that makes exceptions visible.',
      });
    }
    m = WAIVER.exec(line.slice(m.index + m[0].length));
  }
  return { rules, problems };
}

// ── What gets linted ───────────────────────────────────────────────────────────────────────
//
// Source only, by default. An earlier version walked everything it could read, which meant the
// gate reported `6.dp` inside its own README, inside the documentation of the waiver syntax,
// and inside the token file where the raw values are the whole point — 176 findings against
// the repository that defines the standard, most of them nonsense. A rule that reads prose is
// checking whether a sentence uses a number, not whether a layout uses a token.
//
// A rule that genuinely needs a document declares it with `docs: true`.
const SOURCE = /\.(kt|kts|java|xml|gradle)$/i;
const DOCS = /\.(md|json|toml|properties|yml|yaml|txt)$/i;

const isSource = (r) => SOURCE.test(r);
const isDocs = (r) => DOCS.test(r);

// ── Running ───────────────────────────────────────────────────────────────────────────────

function run(appDir, standard) {
  const files = walk(appDir);
  const rel = (f) => path.relative(appDir, f).split(path.sep).join('/');

  const byRule = new Map(standard.rules.map((r) => [r.id, r]));
  const findings = [];
  const waived = [];
  const seenFiles = new Set();

  const add = (ruleId, file, line, message, extra) => {
    const rule = byRule.get(ruleId);
    if (!rule) return;
    findings.push({
      rule: ruleId,
      severity: extra && extra.severity ? extra.severity : rule.severity || 'error',
      title: rule.title,
      scope: rule.scope,
      file,
      line,
      message,
    });
  };

  const record = (impl, f, r, line, waiverText) => {
    const rule = byRule.get(impl.id);
    const finding = {
      rule: impl.id,
      severity: (f.severity || rule.severity) || 'error',
      title: rule.title,
      scope: rule.scope,
      file: r,
      line: f.line || line,
      message: f.message || String(f),
    };
    if (waiverText) waived.push({ ...finding, waiver: waiverText.trim() });
    else findings.push(finding);
  };

  // ── Repository-scoped rules: exactly once ───────────────────────────────────────────────
  // A rule that takes `repo` is looking at the whole tree — whether a domain package has
  // tests, whether the CI runs anything. Running it once per file produced 322 identical
  // findings for build.library-has-tests on a 322-file repository, which is the same failure
  // as a rule that never fires, pointed the other way: right answer, unusable count.
  const ctx = { appDir, files, rel, readText, add, byRule };
  for (const impl of RULES) {
    if (!impl.repo || !byRule.has(impl.id)) continue;
    const produced = impl.repo(ctx) || [];
    for (const f of [].concat(produced)) if (f) findings.push(f);
  }

  // ── Per-file rules ──────────────────────────────────────────────────────────────────────
  for (const impl of RULES) {
    if (impl.repo || !byRule.has(impl.id)) continue;

    // A rule that does not say which files it cares about cares about all of them. An
    // earlier version called impl.appliesTo unconditionally and every rule that relied on
    // `exempt` instead threw on the first file — so the linter crashed on every app, which
    // is a spectacularly visible way to ship a gate that has never run.
    const appliesTo = typeof impl.appliesTo === 'function' ? impl.appliesTo : () => true;
    // `exempt` is how a rule declares the files where its literal is legitimate rather than
    // sloppy. Canvas draw scopes convert dp to pixels for stroke widths; there is no spacing
    // token for those and flagging them produces hundreds of findings nobody can act on,
    // which is how a gate gets switched off.
    const isExempt = typeof impl.exempt === 'function' ? impl.exempt : () => false;
    // Source by default; documents only where the rule asks for them by name.
    const wants = (r) => (impl.docs ? isSource(r) || isDocs(r) : isSource(r));

    for (const file of files) {
      const r = rel(file);
      // Cheap path tests first, then read, then the exemption — because `exempt` may need to
      // look at the file's contents. Reading before checking applicability would read every
      // file in the tree including the ones no rule cares about.
      if (!wants(r) || !appliesTo(r)) continue;
      const text = readText(file);
      if (text === null) continue;
      if (isExempt(r, text)) continue;
      seenFiles.add(r);

      const base = { raw: '', line: '', lineNo: 0, file: r, text, relPath: file, appDir, readText };

      // Waivers live in code. A document that explains the waiver syntax necessarily contains
      // the marker with no rule id after it — "every @kraft-lint-ignore in the diff carries a
      // reason" is a sentence, not a broken waiver — so scanning prose reported four documents
      // and standard.json itself as malformed. Prose cannot waive anything.
      //
      // The same applies to KDoc inside a source file. gitakraft's new GitaMetrics.kt explains
      // why it was written instead of using five waivers, and the sentence explaining that
      // contained the marker with nothing after it, so the file was reported as holding three
      // broken waivers. A doc comment is documentation whatever file it lives in.
      const mayWaive = isSource(r);
      const isDocLine = (l) => /^\s*(\*|\/\*)/.test(l);

      const lines = text.split('\n');

      // Every line's waivers, computed once. A whole-file rule reports findings with a line
      // number, so it has to be able to honour a waiver on that line — otherwise the only
      // rules a finding could ever be waived against were the per-line ones, which is a
      // limitation nobody would discover until they needed it.
      //
      // Line by line even though the rule reads the whole file. A waiver is a per-line
      // construct, and the marker regex ends in `(.*)$` with no /m flag — fed an entire file
      // it can never match, so every file containing a waiver was reported as a malformed
      // one. The first waiver added to KraftTabBar.kt turned the file that justifies the
      // waiver into a finding against it.
      const lineWaivers = lines.map((l) =>
        mayWaive && !isDocLine(l) ? waiversOn(l) : { rules: new Set(), problems: [] });
      const waiverAt = (lineNo) => {
        const w = lineWaivers[lineNo - 1];
        return w && w.rules.has(impl.id) ? lines[lineNo - 1] : null;
      };

      // A whole-file rule gets the file once. Calling it per line re-scanned the file once
      // per line, so the nine permissions in trainkraft's manifest produced 188 findings.
      if (impl.perFile) {
        lineWaivers.forEach((w, i) => {
          for (const p of w.problems) findings.push({ ...p, file: r, line: i + 1 });
        });
        for (const f of [].concat(impl.check({ ...base, raw: text, line: text }) || [])) {
          if (!f) continue;
          record(impl, f, r, f.line || 1, waiverAt(f.line || 1));
        }
        continue;
      }

      lines.forEach((raw, idx) => {
        const lineNo = idx + 1;
        const w = lineWaivers[idx];
        for (const p of w.problems) findings.push({ ...p, file: r, line: lineNo });
        const reported = impl.check({ ...base, raw, line: raw, lineNo });
        for (const f of [].concat(reported || [])) {
          if (!f) continue;
          record(impl, f, r, lineNo, w.rules.has(impl.id) ? raw : null);
        }
      });
    }
  }

  return { findings, waived, fileCount: files.length };
}

function readText(file) {
  // Binary sniffing by extension. Reading a PNG as utf8 and reporting its bytes as findings
  // would be a spectacular false-positive source.
  if (/\.(png|jpg|jpeg|gif|webp|jar|zip|apk|aar|so|bin|keystore|jks)$/i.test(file)) return null;
  if (/(^|\/)(build|\.git|node_modules)\//.test(file)) return null;
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

// ── Reporting ─────────────────────────────────────────────────────────────────────────────

function report(run1, standard, format) {
  if (format === 'json') {
    process.stdout.write(JSON.stringify({
      standard: standard.version,
      files: run1.fileCount,
      findings: run1.findings,
      waived: run1.waived,
    }, null, 2) + '\n');
    return;
  }
  if (format === 'github') {
    for (const f of [...run1.findings, ...run1.waived]) {
      process.stdout.write(githubAnnotation(f) + '\n');
    }
    return;
  }

  const order = { error: 0, warn: 1, info: 2 };
  const all = [...run1.findings].sort((a, b) =>
    (order[a.severity] - order[b.severity]) || a.file.localeCompare(b.file) || (a.line - b.line));

  let lastFile = null;
  for (const f of all) {
    if (f.file !== lastFile) {
      process.stdout.write('\n' + blue(f.file || '(repository)') + '\n');
      lastFile = f.file;
    }
    const mark = f.severity === 'error' ? red('✗') : f.severity === 'warn' ? yellow('!') : blue('i');
    const loc = f.line ? `:${f.line}` : '';
    process.stdout.write(`  ${mark} ${f.rule}${loc}\n`);
    process.stdout.write(`    ${f.message}\n`);
  }

  const errors = all.filter((f) => f.severity === 'error').length;
  const warns = all.filter((f) => f.severity === 'warn').length;
  const infos = all.filter((f) => f.severity === 'info').length;

  process.stdout.write('\n' + grey('─'.repeat(64)) + '\n');
  if (run1.waived.length) {
    process.stdout.write(grey(`${run1.waived.length} finding(s) waived with a stated reason`));
    process.stdout.write(grey(`  (${[...new Set(run1.waived.map((w) => w.rule))].join(', ')})\n`));
  }
  const implemented = RULES.filter((r) => COVERAGE.automated.includes(r.id)).length;
  process.stdout.write(
    `${errors} error(s), ${warns} warning(s), ${infos} note(s) ` +
    `across ${run1.fileCount} files · standard ${standard.version} · ` +
    `${implemented}/${standard.rules.length} rules automated\n`
  );
  // MANUAL is a map of rule id to reason, not an array. Calling .includes on it threw on the
  // last line of the report, which meant every run printed a correct summary and then exited
  // 2. In CI that reads as "the gate crashed", not "the gate failed" — and the crash was
  // invisible locally because the useful numbers are on stdout, before it happens.
  const manualHere = standard.rules
    .filter((r) => Object.prototype.hasOwnProperty.call(MANUAL, r.id))
    .map((r) => r.id);
  if (manualHere.length) {
    process.stdout.write(grey(`not machine-checked: ${manualHere.join(', ')}\n`));
  }
}

function summaryLine(run1) {
  const errors = run1.findings.filter((f) => f.severity === 'error').length;
  return errors === 0 ? 'no error-severity findings' : `${errors} error-severity finding(s)`;
}

// ── Entry point ───────────────────────────────────────────────────────────────────────────

function main(argv) {
  const args = argv.slice(2);
  if (args.includes('--list-rules')) {
    const std = loadStandard(null).standard;
    for (const r of std.rules) {
      const auto = COVERAGE.automated.includes(r.id);
      process.stdout.write(
        `${auto ? 'auto ' : 'MANUAL'} ${r.id.padEnd(34)} ${r.severity.padEnd(6)} ${r.scope.padEnd(8)} ${r.title}\n`
      );
    }
    return 0;
  }
  if (args.includes('--selftest')) return require('./selftest').run();

  let appDir = null;
  let standardPath = null;
  let format = 'text';
  let quiet = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--standard') standardPath = args[++i];
    else if (a === '--format') format = args[++i];
    else if (a === '--quiet') quiet = true;
    else if (a === '--app') appDir = args[++i];
    else if (!a.startsWith('-')) appDir = a;
  }

  let loaded;
  let std;
  try {
    loaded = loadStandard(standardPath);
    std = loaded.standard;
  } catch (e) {
    process.stderr.write(red(`kraft-lint cannot run: ${e.message}\n`));
    return 2;
  }
  if (!appDir) appDir = process.cwd();
  if (!fs.existsSync(appDir)) {
    process.stderr.write(red(`kraft-lint: no such directory: ${appDir}\n`));
    return 2;
  }

  const result = run(path.resolve(appDir), std);
  if (!quiet) report(result, std, format);
  else if (format === 'github') for (const f of result.findings) process.stdout.write(githubAnnotation(f) + '\n');

  const errors = result.findings.filter((f) => f.severity === 'error').length;
  process.stdout.write(quiet ? summaryLine(result) + '\n' : '');
  return errors > 0 ? 1 : 0;
}

if (require.main === module) {
  // `process.exitCode`, not `process.exit()`. stdout is asynchronous when it is a pipe, and
  // exit() discards whatever has not been flushed — which truncated a 193-finding JSON report
  // at exactly 64KB, the first time anyone piped this tool's output into another program.
  // Setting exitCode lets Node drain the pipe and then terminate with the same status.
  //
  // EPIPE is a normal end, not a crash. `kraft-lint . | head` closes the pipe while findings
  // remain to be written, and Node turns that into an unhandled 'error' event — a stack trace
  // on stderr and a non-zero exit for a command that did its job. Everyone who reads a long
  // report pipes it through head or grep.
  for (const stream of [process.stdout, process.stderr]) {
    stream.on('error', (e) => {
      if (e && e.code === 'EPIPE') process.exit(0);
      throw e;
    });
  }

  try {
    process.exitCode = main(process.argv);
  } catch (e) {
    process.stderr.write(red(`kraft-lint crashed: ${e.stack || e.message}\n`));
    process.exitCode = 2;
  }
}

module.exports = { run, loadStandard, waiversOn, walk, readText };