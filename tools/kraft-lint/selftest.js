#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 *
 * kraft-lint --selftest
 *
 * Three properties, each of which has to be true or the gate is lying:
 *
 *   1. Coverage is complete. Every rule in standard.json is either implemented or listed in
 *      coverage.MANUAL with a reason. A rule in neither is a rule the portfolio believes is
 *      enforced and is not.
 *
 *   2. The rules implement what they claim. Every implemented id exists in the standard, and
 *      every rule the linter is supposed to enforce is reached by at least one finding when
 *      run against a fixture that violates it. A check that never fires is a check that does
 *      not work, and the only way to know is to make it fire on purpose.
 *
 *   3. The docs and the standard agree. Every rule id has prose behind it, and no document
 *      cites an id that does not exist. This is the drift check the whole design turns on: the
 *      prose explains the rules, the JSON enforces them, and this proves neither has run ahead
 *      of the other.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const RULES = require('./rules');
const { AUTOMATED, MANUAL } = require('./rules/coverage');
const { loadStandard } = require('./kraft-lint');

const ROOT = path.join(__dirname, '..', '..');
const DOCS = ['MANIFESTO', 'PRINCIPLES', 'DESIGN', 'ARCHITECTURE', 'STANDARDS', 'CHECKLIST'];

let failures = 0;
const ok = (m) => process.stdout.write(`  [32m✓[0m ${m}\n`);
const bad = (m) => { failures++; process.stdout.write(`  [31m✗[0m ${m}\n`); };

function run() {
  const { standard } = loadStandard(null);
  const ids = standard.rules.map((r) => r.id);

  process.stdout.write(`kraft-lint selftest — standard ${standard.version}, ${ids.length} rules\n\n`);

  // ── 1. Coverage ────────────────────────────────────────────────────────────────────────
  process.stdout.write('coverage\n');
  const implemented = new Set(RULES.map((r) => r.id));
  const manual = new Set(Object.keys(MANUAL));
  const uncovered = ids.filter((i) => !implemented.has(i) && !manual.has(i));
  uncovered.length
    ? bad(`${uncovered.length} rule(s) neither implemented nor explained: ${uncovered.join(', ')}`)
    : ok(`all ${ids.length} rules are either implemented or explained`);

  const stale = [...implemented, ...manual].filter((i) => !ids.includes(i));
  stale.length
    ? bad(`implemented/manual lists name rules that are not in the standard: ${stale.join(', ')}`)
    : ok('no phantom rule ids in the linter');

  const thinReasons = Object.entries(MANUAL).filter(([, v]) => !v || v.length < 40);
  thinReasons.length
    ? bad(`manual entries without a real reason: ${thinReasons.map(([k]) => k).join(', ')}`)
    : ok(`${manual.size} manual rules each carry a reason`);

  // ── 2. The checks fire ─────────────────────────────────────────────────────────────────
  process.stdout.write('\nthe checks fire\n');
  const probes = [
    { id: 'spacing.no-raw-dp', line: 'Modifier.padding(6.dp)', want: /raw dp value/ },
    { id: 'spacing.rhythm', line: 'Modifier.height(13.dp)', want: /not on the 8px rhythm/ },
    { id: 'type.no-raw-sp', line: 'style.copy(fontSize = 17.sp)', want: /raw sp value/ },
    { id: 'radius.from-token', line: 'RoundedCornerShape(18.dp)', want: /not on the radius scale/ },
    { id: 'colour.per-app-declared', line: 'val x = Color(0xFF9CCBFF)', want: /colour literal outside/ },
    { id: 'arch.result-not-exception', line: 'throw IllegalStateException("bad")', want: /expected failure thrown/ },
    { id: 'arch.no-global-mutable-state', line: 'var leaked = 0', want: /top-level mutable state/ },
    { id: 'privacy.no-telemetry', line: 'implementation("com.google.firebase.analytics")', want: /telemetry or advertising/ },
    { id: 'privacy.no-hardcoded-secrets', line: 'val k = "ghp_' + 'a'.repeat(34) + '"', want: /GitHub token/ },
  ];

  for (const p of probes) {
    const impl = RULES.find((r) => r.id === p.id);
    if (!impl) { bad(`${p.id}: no implementation`); continue; }
    const rel = path.join('src', 'main', 'java', 'x', p.id.split('.')[0], `${p.id.split('.')[1]}.kt`);
    const out = [].concat(impl.check({ raw: p.line, line: p.line, lineNo: 1, file: rel, text: p.line, relPath: rel, appDir: '.', readText: () => null }) || []);
    const hit = out.find((f) => p.want.test(f.message || ''));
    hit ? ok(`${p.id} fires`) : bad(`${p.id} did not fire on "${p.line}" (got ${JSON.stringify(out.map((f) => f.message))})`);
  }

  // The generic credential heuristic skips test sources (fixtures assign fake credentials
  // as a matter of course) while token formats stay active everywhere. wallkraft's
  // SettingsViewModelTest was flagged for `apiKey = "existing-key"` on every run.
  process.stdout.write('\nsecrets in test sources\n');
  const secrets = RULES.find((r) => r.id === 'privacy.no-hardcoded-secrets');
  const secretProbe = (file, body) => [].concat(
    secrets.check({ raw: body, line: body, lineNo: 1, file, text: body, relPath: file, appDir: '.', readText: () => null }) || []
  );
  secretProbe('app/src/main/java/com/x/y/Thing.kt', 'val k = "ghp_' + 'a'.repeat(34) + '"').length === 1
    ? ok('a GitHub token in main source is still caught')
    : bad('a GitHub token in main source was missed');
  secretProbe('app/src/test/java/com/x/y/ThingTest.kt', 'val k = "ghp_' + 'a'.repeat(34) + '"').length === 1
    ? ok('a GitHub token in test source is still caught')
    : bad('a GitHub token in test source was missed');
  secretProbe('app/src/main/java/com/x/y/Thing.kt', 'val apiKey = "existing-key"').length === 1
    ? ok('a credential literal in main source is still caught')
    : bad('a credential literal in main source was missed');
  secretProbe('app/src/test/java/com/x/y/ThingTest.kt', 'val apiKey = "existing-key"').length === 0
    ? ok('a fixture credential in test source is not reported')
    : bad('a fixture credential in test source was reported');

  // Domain purity needs the file path to carry /domain/, which the probes above do.
  const domain = RULES.find((r) => r.id === 'arch.domain-pure');
  if (domain) {
    const rel = path.join('src', 'main', 'java', 'x', 'domain', 'Engine.kt');
    const out = [].concat(domain.check({
      raw: 'import android.content.Context\nclass Engine',
      line: 'import android.content.Context', lineNo: 1, file: rel,
      text: 'import android.content.Context', relPath: rel, appDir: '.', readText: () => null,
    }) || []);
    out.some((f) => /pure Kotlin/.test(f.message)) ? ok('arch.domain-pure fires') : bad('arch.domain-pure did not fire on an android import');
  }

  // Waivers
  process.stdout.write('\nwaivers\n');
  const { waiversOn } = require('./kraft-lint');
  const good = waiversOn('  val x = 6.dp // @kraft-lint-ignore spacing.no-raw-dp — optical nudge');
  good.rules.has('spacing.no-raw-dp') && !good.problems.length
    ? ok('a waiver with a reason is accepted')
    : bad(`a valid waiver was not parsed: ${JSON.stringify(good)}`);
  const noReason = waiversOn('  val x = 6.dp // @kraft-lint-ignore spacing.no-raw-dp');
  noReason.problems.some((p) => p.rule === 'waiver.no-reason')
    ? ok('a waiver without a reason is an error')
    : bad('a waiver without a reason was accepted');
  const bare = waiversOn('  val x = 6.dp // @kraft-lint-ignore');
  bare.problems.some((p) => p.rule === 'waiver.malformed')
    ? ok('a waiver with no rule id is an error')
    : bad('a waiver with no rule id was accepted');
  const stray = waiversOn('  // nothing to do with the linter here');
  stray.problems.length === 0 && stray.rules.size === 0
    ? ok('an ordinary comment is not mistaken for a waiver')
    : bad('an ordinary comment was parsed as a waiver');

  // One marker may waive several rules. A single off-rhythm literal fires both spacing rules
  // at once, and wallkraft's 1.5dp purity border proved that one marker per line was not
  // enough — waiving no-raw-dp left the rhythm finding standing on the same literal.
  const multi = waiversOn('  x(1.5.dp), // @kraft-lint-ignore spacing.no-raw-dp, spacing.rhythm — purity hint');
  multi.rules.has('spacing.no-raw-dp') && multi.rules.has('spacing.rhythm') && !multi.problems.length
    ? ok('a comma-separated waiver covers several rules')
    : bad(`a multi-rule waiver was not parsed: ${JSON.stringify([...multi.rules])}`);

  // ── 3. Docs and standard agree ─────────────────────────────────────────────────────────
  process.stdout.write('\ndocs and standard\n');
  const docPath = path.join(ROOT, 'docs');
  const present = DOCS.filter((d) => fs.existsSync(path.join(docPath, `${d}.md`)));
  present.length === DOCS.length
    ? ok(`all ${DOCS.length} documents present`)
    : bad(`missing documents: ${DOCS.filter((d) => !present.includes(d)).join(', ')}`);

  if (present.length === DOCS.length) {
    const all = present.map((d) => fs.readFileSync(path.join(docPath, `${d}.md`), 'utf8')).join('\n');
    const uncited = ids.filter((i) => !all.includes(i));
    uncited.length
      ? bad(`${uncited.length} rule(s) have no prose behind them: ${uncited.join(', ')}`)
      : ok('every rule is explained in the documents');

    const phantom = [...new Set([...all.matchAll(/`([a-z]+\.[a-z0-9-]+)`/g)].map((m) => m[1]))]
      .filter((x) => !ids.includes(x));
    phantom.length
      ? bad(`documents cite ids that are not in the standard: ${phantom.join(', ')}`)
      : ok('no document cites a rule that does not exist');
  }

  // ── 4. End to end, exit codes included ─────────────────────────────────────────────────
  // Every earlier probe calls a check directly. That left the reporting path untested, and a
  // bad line there made every run print a correct summary and then exit 2 — a crash that looks
  // like a clean run if you only read stdout, which is where the numbers are. So: run the real
  // binary over a fixture in every output format and require the exit code to mean what it
  // says. A gate whose exit code lies about its own result is worse than no gate.
  process.stdout.write('\nend to end\n');
  const { execFileSync } = require('child_process');
  const os = require('os');
  const bin = path.join(__dirname, 'kraft-lint.js');

  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'kraft-lint-fixture-'));
  const srcDir = path.join(fixture, 'app', 'src', 'main', 'java', 'com', 'x', 'y');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(path.join(fixture, 'app', 'src', 'main'), { recursive: true });
  fs.writeFileSync(
    path.join(srcDir, 'Bad.kt'),
    'package com.x.y\n\nimport androidx.compose.ui.unit.dp\n\nval a = 6.dp\nval b = 13.dp\nvar leak = 1\n'
  );
  fs.writeFileSync(
    path.join(fixture, 'app', 'src', 'main', 'AndroidManifest.xml'),
    '<!-- no reason given -->\n<manifest>\n  <uses-permission android:name="android.permission.INTERNET" />\n</manifest>\n'
  );
  fs.writeFileSync(
    path.join(fixture, 'settings.gradle.kts'),
    'rootProject.name = "fixture"\nincludeBuild("../kraft-foundation")\n'
  );

  const lint = (args) => {
    try {
      const out = execFileSync('node', [bin, fixture, ...args], { encoding: 'utf8' });
      return { code: 0, out, err: '' };
    } catch (e) {
      return { code: e.status, out: e.stdout || '', err: e.stderr || '' };
    }
  };

  const dirty = lint(['--quiet']);
  dirty.code === 1
    ? ok(`a fixture with violations exits 1 (got ${dirty.code})`)
    : bad(`expected exit 1 for a violating fixture, got ${dirty.code}: ${dirty.err.trim() || dirty.out.trim()}`);

  const textRun = lint([]);
  textRun.code === 1 && !textRun.err.includes('crashed')
    ? ok('the text report exits 1 and does not crash')
    : bad(`text report: exit ${textRun.code}${textRun.err ? `, ${textRun.err.trim()}` : ''}`);

  for (const format of ['json', 'github']) {
    const r = lint(['--format', format]);
    r.code === 1 && !r.err.includes('crashed')
      ? ok(`--format ${format} exits 1 and does not crash`)
      : bad(`--format ${format}: exit ${r.code}${r.err ? `, ${r.err.trim()}` : ''}`);
  }

  // A compliant app: a theme composable that passes a Typography built from KraftTypeScale.
  // type.m3-wrapper-present asks whether a theme exists; type.scale-declared asks whether it
  // passes a type scale, and both of these fixtures now have to answer yes to both or the
  // "a compliant tree exits 0" assertion means nothing.
  const THEME_SRC = [
    'package com.x.y.ui.theme',
    '',
    'import androidx.compose.material3.MaterialTheme',
    'import androidx.compose.material3.Typography',
    'import androidx.compose.runtime.Composable',
    'import com.kraft.ui.tokens.KraftTypeScale',
    '',
    'private val XTypography = Typography(',
    '    displayLarge = TextStyle(fontSize = KraftTypeScale.LargeTitle.value.sp),',
    ')',
    '',
    '@Composable',
    'fun XTheme(content: @Composable () -> Unit) {',
    '    MaterialTheme(typography = XTypography, content = content)',
    '}',
    '',
  ].join('\n');

  // A clean app must exit 0, or the gate is not usable as a blocking check.
  const clean = fs.mkdtempSync(path.join(os.tmpdir(), 'kraft-lint-clean-'));
  fs.mkdirSync(path.join(clean, 'app', 'src', 'main', 'java', 'com', 'x', 'y', 'ui', 'theme'), { recursive: true });
  fs.writeFileSync(
    path.join(clean, 'app', 'src', 'main', 'java', 'com', 'x', 'y', 'ui', 'theme', 'Theme.kt'),
    THEME_SRC
  );
  fs.writeFileSync(
    path.join(clean, 'app', 'src', 'main', 'java', 'com', 'x', 'y', 'Good.kt'),
    'package com.x.y\n\nimport com.kraft.ui.tokens.KraftSpacing\n\nval a = KraftSpacing.Medium\n'
  );
  fs.writeFileSync(
    path.join(clean, 'app', 'src', 'main', 'AndroidManifest.xml'),
    '<manifest>\n  <!-- INTERNET: sync, see https://example.com/why -->\n  <uses-permission android:name="android.permission.INTERNET" />\n</manifest>\n'
  );
  fs.writeFileSync(
    path.join(clean, 'settings.gradle.kts'),
    'rootProject.name = "fixture"\nincludeBuild("../kraft-foundation")\n'
  );
  const cleanRun = lint([clean, '--quiet']);
  cleanRun.code === 0
    ? ok('a compliant fixture exits 0')
    : bad(`expected exit 0 for a compliant fixture, got ${cleanRun.code}: ${cleanRun.out.trim()}`);

  // And the coverage line must be present in every text report, since the honesty claim
  // depends on it being unmissable rather than something you find in a source file.
  /rules automated/.test(textRun.out)
    ? ok('the text report states its own coverage')
    : bad('the text report does not state its coverage ratio');

  // A waiver must survive both kinds of rule. The per-file path used to hand the whole file
  // to the waiver parser, whose regex cannot cross a newline, so any file containing a waiver
  // was also reported as containing a malformed one — the file that justified the waiver
  // became a finding against it, on the same run that honoured it.
  process.stdout.write('\nwaivers in files that whole-file rules also read\n');
  const mixed = fs.mkdtempSync(path.join(os.tmpdir(), 'kraft-lint-waiver-'));
  fs.mkdirSync(path.join(mixed, 'app', 'src', 'main', 'java', 'com', 'x', 'y'), { recursive: true });
  fs.mkdirSync(path.join(mixed, 'app', 'src', 'main'), { recursive: true });
  fs.writeFileSync(path.join(mixed, 'settings.gradle.kts'),
    'rootProject.name = "fixture"\nincludeBuild("../kraft-foundation")\n');
  fs.writeFileSync(path.join(mixed, 'app', 'src', 'main', 'AndroidManifest.xml'), '<manifest/>\n');
  fs.writeFileSync(
    path.join(mixed, 'app', 'src', 'main', 'java', 'com', 'x', 'y', 'Thing.kt'),
    [
      'package com.x.y',
      '',
      'import androidx.compose.ui.unit.dp',
      '',
      '// A comment mentioning @kraft-lint-ignore in prose must not be read as a waiver.',
      'val nudged = 2.dp, // @kraft-lint-ignore spacing.no-raw-dp — optical nudge',
      'val also = 3.dp, // @kraft-lint-ignore spacing.no-raw-dp — another nudge',
      'val real = 7.dp,',
      '',
    ].join('\n')
  );
  // KDoc inside a source file is documentation too. gitakraft's GitaMetrics.kt explains why it
  // was written instead of five separate waivers, and the sentence doing the explaining
  // contained the marker with nothing after it — so the file was reported as holding three
  // malformed waivers.
  fs.writeFileSync(
    path.join(mixed, 'app', 'src', 'main', 'java', 'com', 'x', 'y', 'Doc.kt'),
    [
      'package com.x.y',
      '',
      '/**',
      ' * Each of these was a `@kraft-lint-ignore` waiver before this file existed.',
      ' * A doc comment cannot waive anything.',
      ' */',
      'object Metrics {',
      '    val Pill = 340.dp // @kraft-lint-ignore spacing.no-raw-dp — a metric, not spacing',
      '}',
      '',
    ].join('\n')
  );
  const kdocRun = lint([mixed, '--format', 'json']);
  let kdocJson = { findings: [], waived: [] };
  try { kdocJson = JSON.parse(kdocRun.out); } catch { /* reported below */ }
  const kdocMalformed = kdocJson.findings.filter((f) => String(f.rule).startsWith('waiver.'));
  kdocMalformed.length === 0
    ? ok('prose in KDoc is not read as a waiver')
    : bad(`${kdocMalformed.length} spurious waiver.malformed from KDoc: ${JSON.stringify(kdocMalformed.map((m) => m.line))}`);
  // Scoped to Doc.kt: this fixture directory also holds Thing.kt, whose two waivers were
  // asserted separately below.
  const kdocWaived = kdocJson.waived.filter(
    (f) => f.rule === 'spacing.no-raw-dp' && f.file.endsWith('Doc.kt')
  );
  kdocWaived.length === 1
    ? ok('a real waiver beside KDoc is still honoured')
    : bad(`expected the one real waiver to be honoured, got ${kdocWaived.length}`);

  const mixedRun = lint([mixed, '--format', 'json']);
  let mixedJson = { findings: [], waived: [] };
  try { mixedJson = JSON.parse(mixedRun.out); } catch { /* reported below */ }
  const malformed = mixedJson.findings.filter((f) => String(f.rule).startsWith('waiver.'));
  malformed.length === 0
    ? ok('no false waiver.malformed in a file a whole-file rule also reads')
    : bad(`${malformed.length} spurious waiver.malformed finding(s): ${JSON.stringify(malformed.map((m) => m.line))}`);

  const waivedHere = mixedJson.waived.filter(
    (f) => f.rule === 'spacing.no-raw-dp' && f.file.endsWith('Thing.kt')
  );
  waivedHere.length === 2
    ? ok(`both waivers honoured (got ${waivedHere.length})`)
    : bad(`expected 2 waived dp findings, got ${waivedHere.length}: ${JSON.stringify(mixedJson.waived.map((w) => w.rule))}`);

  // The one line with no waiver must still be reported — otherwise "both waivers honoured"
  // could just mean "the rule stopped working".
  const stillFires = mixedJson.findings.filter((f) => f.rule === 'spacing.no-raw-dp' && f.line === 8);
  stillFires.length === 1
    ? ok('the unwaived literal on line 8 is still reported')
    : bad(`expected the unwaived 7.dp on line 8 to be reported, got ${JSON.stringify(mixedJson.findings.map((f) => f.rule + ':' + f.line))}`);
  // Output must survive a pipe. stdout is asynchronous when it is not a TTY, and calling
  // process.exit() instead of setting exitCode discards the unwritten tail — which truncated a
  // 193-finding JSON report at exactly 64KB the first time this tool's output was piped into
  // another program. Silent data loss, and it only happens when someone uses the thing.
  process.stdout.write('\noutput integrity through a pipe\n');
  const noisy = fs.mkdtempSync(path.join(os.tmpdir(), 'kraft-lint-noisy-'));
  fs.mkdirSync(path.join(noisy, 'app', 'src', 'main', 'java', 'com', 'x', 'y', 'ui', 'theme'), { recursive: true });
  fs.writeFileSync(
    path.join(noisy, 'app', 'src', 'main', 'java', 'com', 'x', 'y', 'ui', 'theme', 'Theme.kt'),
    THEME_SRC
  );
  fs.mkdirSync(path.join(noisy, 'app', 'src', 'main'), { recursive: true });
  fs.writeFileSync(path.join(noisy, 'settings.gradle.kts'),
    'rootProject.name = "fixture"\nincludeBuild("../kraft-foundation")\n');
  fs.writeFileSync(path.join(noisy, 'app', 'src', 'main', 'AndroidManifest.xml'), '<manifest/>\n');
  // Comfortably more than one pipe buffer: 400 files x 2 findings.
  for (let i = 0; i < 400; i++) {
    fs.writeFileSync(
      path.join(noisy, 'app', 'src', 'main', 'java', 'com', 'x', 'y', `F${i}.kt`),
      `package com.x.y\nimport androidx.compose.ui.unit.dp\nval a = 6.dp\nval b = 13.dp\n`
    );
  }
  const piped = lint([noisy, '--format', 'json']);
  let big = null;
  try { big = JSON.parse(piped.out); } catch { /* reported below */ }
  // Three per file, not two: spacing.no-raw-dp fires on both 6.dp and 13.dp, and
  // spacing.rhythm only on 13.dp because 6 is on the rhythm. An earlier version of this
  // expectation said 800, on the reasoning "two rules x 400 files", and the run disagreed.
  const expectedFindings = 400 * 3;
  if (!big) {
    bad(`piped JSON did not parse — output was truncated at ${piped.out.length} bytes`);
  } else if (big.findings.length !== expectedFindings) {
    bad(`piped JSON lost findings: expected ${expectedFindings}, got ${big.findings.length} ` +
        `(output ${piped.out.length} bytes — truncation)`);
  } else {
    ok(`all ${expectedFindings} findings survive a pipe (${piped.out.length} bytes of JSON)`);
  }
  // Piping into something that stops reading must not be a crash. `kraft-lint . | head` closes
  // the pipe while findings remain, and Node raises an unhandled EPIPE — a stack trace and a
  // non-zero exit for a command that worked. Everyone reads a long report through head or grep.
  process.stdout.write('\nclosed pipe\n');
  try {
    // bash with pipefail, not sh. A plain `cmd | head` reports *head's* exit status, so a
    // linter that dies mid-write still looks like success — which is precisely what happened
    // to the first version of this test: removing the EPIPE handler changed nothing here,
    // because the test was reading the wrong process's verdict.
    execFileSync('bash', ['-c',
      `set -o pipefail; ${JSON.stringify(bin)} ${JSON.stringify(noisy)} | head -3`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    ok('piping into head does not crash the linter');
  } catch (e) {
    const stderrText = String(e.stderr || '');
    if (/EPIPE/.test(stderrText)) {
      bad('piping into head crashes with EPIPE — the consumer closed the pipe early');
    } else {
      bad(`piping into head failed unexpectedly: ${stderrText.trim().split('\n')[0] || e.message}`);
    }
  }
  fs.rmSync(noisy, { recursive: true, force: true });

  fs.rmSync(mixed, { recursive: true, force: true });
  fs.rmSync(fixture, { recursive: true, force: true });
  fs.rmSync(clean, { recursive: true, force: true });

  // Repo-scoped rules look at the tree rather than a line, so they need a directory to
  // decide about. Each is probed in both directions: a tree that must be flagged, and one
  // that must not. The second half matters as much as the first — a rule that fires
  // unconditionally passes a "does it fire" test forever.
  process.stdout.write('\nrepo-scoped rules\n');
  const os2 = require('os');
  const { readText, walk, run } = require('./kraft-lint');

  // Real directories on disk, not a map of strings. An earlier version of this harness
  // passed `readText: () => null` and a list of paths that did not exist, so three rules that
  // read their inputs found nothing and appeared broken — a test that fails because its own
  // fixtures are fiction is worse than no test, because it looks like a finding.
  const mk = (files) => {
    const d = fs.mkdtempSync(path.join(os2.tmpdir(), 'kraft-lint-repo-'));
    for (const [rel, body] of Object.entries(files)) {
      const p = path.join(d, rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, body);
    }
    return d;
  };
  const runRepo = (id, files) => {
    const impl = RULES.find((r) => r.id === id);
    if (!impl || typeof impl.repo !== 'function') return null;
    const d = mk(files);
    const list = walk(d);
    const hits = [];
    impl.repo({
      appDir: d, files: list,
      rel: (f) => path.relative(d, f).split(path.sep).join('/'),
      readText, add: (ruleId, file, line, message) => hits.push({ rule: ruleId, file, line, message }),
      byRule: new Map(),
    });
    fs.rmSync(d, { recursive: true, force: true });
    return hits;
  };

  const THEME = '@Composable\nfun GitaKraftTheme(content: @Composable () -> Unit) { }\n';
  const BARE = 'setContent { Box(Modifier.fillMaxSize()) }\n';

  const m3Fire = runRepo('type.m3-wrapper-present', {
    'app/src/main/java/com/x/y/MainActivity.kt': BARE,
  });
  m3Fire === null ? bad('type.m3-wrapper-present is not implemented')
    : m3Fire.length === 1 ? ok('type.m3-wrapper-present fires on an app with no theme composable')
    : bad('type.m3-wrapper-present missed an app with no theme composable');

  // The regression this rule kept having: a wrapper named by the app rather than by Material,
  // or applied one frame below MainActivity, is still a wrapper.
  const m3Deep = runRepo('type.m3-wrapper-present', {
    'app/src/main/java/com/x/y/MainActivity.kt': 'setContent { EnglishKraftApp(state = s) }\n',
    'app/src/main/java/com/x/y/ui/App.kt': '@Composable fun EnglishKraftApp(state: S) {\n  EnglishKraftTheme { Home(state) }\n}\n',
    'app/src/main/java/com/x/y/ui/theme/Theme.kt': THEME,
  });
  m3Deep === null ? bad('type.m3-wrapper-present is not implemented')
    : m3Deep.length === 0 ? ok('type.m3-wrapper-present accepts a theme applied below MainActivity')
    : bad('type.m3-wrapper-present flagged a correctly themed app');

  // A theme that exists only in test sources is not a theme the app ships. Dropping the
  // /src/main/ filter made this pass and nothing caught it — found by mutating the rule and
  // then reading the probe list for what was missing.
  const m3TestOnly = runRepo('type.m3-wrapper-present', {
    'app/src/main/java/com/x/y/MainActivity.kt': BARE,
    'app/src/test/java/com/x/y/ThemeTest.kt': THEME,
  });
  m3TestOnly === null ? bad('type.m3-wrapper-present is not implemented')
    : m3TestOnly.length === 1 ? ok('type.m3-wrapper-present ignores a theme in test sources')
    : bad('type.m3-wrapper-present accepted a theme that exists only in tests');

  const sharedOk = runRepo('build.uses-shared-library', {
    'settings.gradle.kts': 'rootProject.name = "x"\nincludeBuild("../kraft-foundation")\n',
  });
  sharedOk && sharedOk.length === 0
    ? ok('build.uses-shared-library accepts an app that consumes the foundation')
    : bad('build.uses-shared-library flagged a consuming app');

  const sharedBad = runRepo('build.uses-shared-library', { 'settings.gradle.kts': 'rootProject.name = "x"\n' });
  sharedBad && sharedBad.length === 1
    ? ok('build.uses-shared-library fires on an app that does not')
    : bad('build.uses-shared-library missed a non-consuming app');

  // The foundation cannot consume itself, and reporting that made the repository defining the
  // standard fail its own gate.
  const sharedSelf = runRepo('build.uses-shared-library', {
    'settings.gradle.kts': 'rootProject.name = "kraft-foundation"\n',
    'kraft-ui/src/main/java/com/kraft/ui/Theme.kt': THEME,
  });
  sharedSelf && sharedSelf.length === 0
    ? ok('build.uses-shared-library does not fire on the foundation itself')
    : bad('build.uses-shared-library fired on the foundation itself');

  // The app beside its foundation checkout, which is the CI layout: the app at the root and
  // the foundation as a sibling directory, scanned as one tree. find() used to return
  // whichever settings.gradle.kts came first in directory order — the foundation's, which
  // has no includeBuild — so a correctly consuming app was reported as not consuming it.
  // langkraft's first CI run failed on exactly this: 170 milliseconds, two findings, both
  // wrong, while the same gate passed locally where no sibling was present.
  //
  // The sibling here carries no kraft-ui source, so the foundation-presence exemption does
  // not apply and the settings choice alone decides. The foundation's files come FIRST,
  // because that is the order that triggers the bug: directory order put
  // kraft-foundation/settings.gradle.kts before the app's own. Listing the app's settings
  // first would pass with the bug still present — verified by reverting, which this probe
  // then catches.
  const sharedSibling = runRepo('build.uses-shared-library', {
    'kraft-foundation/settings.gradle.kts': 'rootProject.name = "kraft-foundation"\n',
    'kraft-foundation/standards/standard.json': '{}\n',
    'settings.gradle.kts': 'rootProject.name = "x"\nincludeBuild("../kraft-foundation")\n',
  });
  sharedSibling && sharedSibling.length === 0
    ? ok('build.uses-shared-library reads the app settings, not the sibling foundation')
    : bad(`build.uses-shared-library fired with a foundation sibling present: ${JSON.stringify(sharedSibling.map((f) => f.file))}`);

  // Only meaningful where the foundation's modules actually are. Hard-coding the module names
  // made this fire on all nine apps — a finding no app can fix.
  const libQuiet = runRepo('build.library-has-tests', { 'app/src/main/java/com/x/y/A.kt': 'class A\n' });
  libQuiet && libQuiet.length === 0
    ? ok('build.library-has-tests stays quiet on an app with no library modules')
    : bad('build.library-has-tests fired on an app with no library modules');

  const libMissing = runRepo('build.library-has-tests', { 'kraft-ui/src/main/java/com/kraft/ui/T.kt': 'class T\n' });
  libMissing && libMissing.length === 1
    ? ok('build.library-has-tests fires on an untested kraft-ui')
    : bad('build.library-has-tests missed an untested kraft-ui');

  const libOk = runRepo('build.library-has-tests', {
    'kraft-ui/src/main/java/com/kraft/ui/T.kt': 'class T\n',
    'kraft-ui/src/test/java/com/kraft/ui/TTest.kt': 'class TTest\n',
  });
  libOk && libOk.length === 0
    ? ok('build.library-has-tests accepts a tested kraft-ui')
    : bad('build.library-has-tests fired on a tested kraft-ui');

  // A palette is recognised by building a colour scheme, not by where it lives. englishkraft
  // and langkraft keep theirs in ui/Theme.kt rather than ui/theme/, and the path-based
  // exemption reported 21 and 36 findings in the two files that were each a complete palette.
  process.stdout.write('\na palette is a palette wherever it lives\n');
  const paletteRun = (files) => {
    const d = mk(files);
    const { standard } = loadStandard(null);
    const res = run(d, standard);
    fs.rmSync(d, { recursive: true, force: true });
    return res.findings.filter((f) => f.rule === 'colour.per-app-declared');
  };
  const SCHEME = 'package com.x.y\n\nprivate val Scheme = darkColorScheme(\n    primary = Color(0xFF9CCBFF),\n)\n';
  const inUiTheme = paletteRun({ 'app/src/main/java/com/x/y/ui/theme/Theme.kt': SCHEME });
  inUiTheme.length === 0
    ? ok('a palette in ui/theme/ has no colour findings')
    : bad(`a palette in ui/theme/ produced ${inUiTheme.length} findings`);

  const inUi = paletteRun({ 'app/src/main/java/com/x/y/ui/Theme.kt': SCHEME });
  inUi.length === 0
    ? ok('a palette in ui/Theme.kt has no colour findings either')
    : bad(`a palette outside ui/theme/ produced ${inUi.length} findings — the rule is still path-based`);

  const inScreen = paletteRun({
    'app/src/main/java/com/x/y/ui/SettingsScreen.kt':
      'package com.x.y\n\nRow {\n  SettingRow(tint = Color(0xFF30D158))\n  SettingRow(tint = Color(0xFF30D158))\n}\n',
  });
  inScreen.length === 2
    ? ok('the same literal twice in a screen is still 2 findings')
    : bad(`expected 2 findings for a repeated literal in a screen, got ${inScreen.length}`);

  // The same principle for type: a file that constructs a Typography is where type values
  // are defined. langkraft keeps its scale in ui/Theme.kt rather than ui/theme/, and the
  // path-based exemption reported 14 findings in the file that defines the app's type.
  const typeRun = (files) => {
    const d = mk(files);
    const { standard } = loadStandard(null);
    const res = run(d, standard);
    fs.rmSync(d, { recursive: true, force: true });
    return res.findings.filter((f) => f.rule === 'type.no-raw-sp');
  };
  const TYPE_DEF = 'package com.x.y\n\nprivate val XType = Typography(\n    displayLarge = TextStyle(fontSize = 34.sp),\n)\n';
  typeRun({ 'app/src/main/java/com/x/y/ui/Theme.kt': TYPE_DEF }).length === 0
    ? ok('a type definition outside ui/theme/ has no sp findings')
    : bad('a type definition outside ui/theme/ was reported');
  typeRun({
    'app/src/main/java/com/x/y/ui/Screen.kt': 'package com.x.y\n\nText("x", fontSize = 17.sp)\n',
  }).length === 1
    ? ok('a raw sp in a screen is still a finding')
    : bad('a raw sp in a screen was not reported');

  // A metrics object is a definition file wherever it lives. langkraft's LangMetrics sits in
  // ui/ rather than ui/theme/, and the path exemption reported it. The check is narrow on
  // purpose: an object holding only dp/sp vals. File-private constants outside an object are
  // still findings — and the first version of this check omitted the object requirement and
  // exempted any file of bare vals, which the pipe fixture then proved by going quiet.
  const metricsRun = (files) => {
    const d = mk(files);
    const { standard } = loadStandard(null);
    const res = run(d, standard);
    fs.rmSync(d, { recursive: true, force: true });
    return res.findings.filter((f) => f.rule === 'spacing.no-raw-dp');
  };
  const METRICS = 'package com.x.y\n\nimport androidx.compose.ui.unit.dp\n\nobject XMetrics {\n    val CardMaxWidth = 640.dp\n}\n';
  metricsRun({ 'app/src/main/java/com/x/y/ui/Metrics.kt': METRICS }).length === 0
    ? ok('a metrics object outside ui/theme/ has no dp findings')
    : bad('a metrics object outside ui/theme/ was reported');
  metricsRun({
    'app/src/main/java/com/x/y/ui/Screen.kt': 'package com.x.y\n\nimport androidx.compose.ui.unit.dp\n\nval cardMaxWidth = 640.dp\n',
  }).length === 1
    ? ok('a file-private dp constant is still a finding')
    : bad('a file-private dp constant was exempted as a metrics file');

  // A removal directive is not a request — tools:node="remove" strips a permission a
  // library's manifest merged in. And a justification may sit above a sibling element,
  // lines away from the uses-permission it covers. englishkraft's manifest does both at
  // once, and the rule flagged it for having no reason.
  process.stdout.write('\npermissions, removals, and distant reasons\n');
  const manifestRun = (body) => {
    const d = mk({ 'app/src/main/AndroidManifest.xml': body });
    const { standard } = loadStandard(null);
    const res = run(d, standard);
    fs.rmSync(d, { recursive: true, force: true });
    return res.findings.filter((f) => f.rule === 'privacy.permission-justified');
  };
  manifestRun(
    '<manifest>\n  <uses-permission android:name="android.permission.CAMERA" />\n</manifest>\n'
  ).length === 1
    ? ok('an unexplained permission is still a finding')
    : bad('an unexplained permission was accepted');

  manifestRun(
    '<manifest>\n  <!-- INTERNET: sync, see https://example.com/why -->\n' +
    '  <uses-permission android:name="android.permission.INTERNET" />\n</manifest>\n'
  ).length === 0
    ? ok('a comment directly above the permission is accepted')
    : bad('a comment directly above the permission was rejected');

  manifestRun(
    '<manifest xmlns:tools="http://schemas.android.com/tools">\n' +
    '  <!-- androidx.core declares this for a receiver this app never registers.\n' +
    '       Both the declaration and the request are dead weight. -->\n' +
    '  <permission android:name="com.x.REMOVED" tools:node="remove" />\n' +
    '  <uses-permission android:name="com.x.REMOVED" tools:node="remove" />\n' +
    '</manifest>\n'
  ).length === 0
    ? ok('a tools:node="remove" directive with a distant reason is accepted')
    : bad('a removal directive was reported as an unjustified permission');

  manifestRun(
    '<manifest xmlns:tools="http://schemas.android.com/tools">\n' +
    '  <uses-permission android:name="com.x.REMOVED" tools:node="remove" />\n' +
    '</manifest>\n'
  ).length === 0
    ? ok('a bare removal directive is not a permission request')
    : bad('a bare removal directive was reported as an unjustified permission');

  // type.scale-declared has to see three different failures and one success, and the success
  // matters most: wallkraft holds its scale in an object and passes `KraftTypography.Typography`,
  // and an earlier version captured only the first segment of that name and reported the one app
  // in the portfolio that gets this right.
  process.stdout.write('\nthe type scale, in all its forms\n');
  const scaleRun = (files) => {
    const d = mk(files);
    const { standard } = loadStandard(null);
    const res = run(d, standard);
    fs.rmSync(d, { recursive: true, force: true });
    return res.findings.filter((f) => f.rule === 'type.scale-declared');
  };
  const themeWith = (typography) =>
    'package com.x.y.ui\n\nimport androidx.compose.material3.MaterialTheme\nimport androidx.compose.material3.Typography\nimport androidx.compose.runtime.Composable\nimport com.kraft.ui.tokens.KraftTypeScale\n\n' +
    'private val XTypography = Typography(displayLarge = TextStyle(fontSize = KraftTypeScale.LargeTitle.value.sp))\n\n' +
    '@Composable\nfun XTheme(content: @Composable () -> Unit) {\n    MaterialTheme(\n        ' + typography + '\n        content = content,\n    )\n}\n';

  scaleRun({ 'app/src/main/java/com/x/y/ui/Theme.kt': themeWith('typography = XTypography,') }).length === 0
    ? ok('a theme built from KraftTypeScale passes')
    : bad('a theme built from KraftTypeScale was reported');

  const noArg = scaleRun({
    'app/src/main/java/com/x/y/ui/Theme.kt':
      'package com.x.y.ui\n\nimport androidx.compose.material3.MaterialTheme\nimport androidx.compose.runtime.Composable\n\n' +
      '@Composable\nfun XTheme(content: @Composable () -> Unit) {\n    MaterialTheme(content = content)\n}\n',
  });
  noArg.length === 1 && /passes no typography/.test(noArg[0].message)
    ? ok('a theme that passes no typography at all is caught')
    : bad(`a theme passing no typography was not caught: ${JSON.stringify(noArg.map((f) => f.message))}`);

  const stock = scaleRun({ 'app/src/main/java/com/x/y/ui/Theme.kt': themeWith('typography = Typography(),') });
  stock.length === 1 && /stock Typography/.test(stock[0].message)
    ? ok('stock Typography() is caught')
    : bad(`stock Typography() was not caught: ${JSON.stringify(stock.map((f) => f.message))}`);

  // The scale lives in an object and is passed qualified — wallkraft's shape.
  //
  // The property is deliberately NOT called `Typography`. wallkraft happens to name it that, and
  // a first version of this test did too, so it resolved through the bare property name and
  // never exercised the qualifier: deleting `(?:Object\.)?` from the lookup changed nothing and
  // this probe reported the code as covered when it was not.
  const qualified = scaleRun({
    'app/src/main/java/com/x/y/ui/Theme.kt':
      'package com.x.y.ui\n\nimport androidx.compose.material3.MaterialTheme\nimport androidx.compose.material3.Typography\nimport androidx.compose.runtime.Composable\nimport com.kraft.ui.tokens.KraftTypeScale\n\n' +
      'object XType {\n    val Scale = Typography(displayLarge = TextStyle(fontSize = KraftTypeScale.LargeTitle.value.sp))\n}\n\n' +
      '@Composable\nfun XTheme(content: @Composable () -> Unit) {\n    MaterialTheme(\n        typography = XType.Scale,\n        content = content,\n    )\n}\n',
  });
  qualified.length === 0
    ? ok('a qualified name whose property is not named Typography resolves')
    : bad(`a qualified typography name was reported: ${JSON.stringify(qualified.map((f) => f.message))}`);

  // Its own scale, restated rather than taken from the tokens — langkraft, kalc, krafttools,
  // gitakraft all do this, and it is a real finding rather than a false one.
  const ownScale = scaleRun({
    'app/src/main/java/com/x/y/ui/Theme.kt':
      'package com.x.y.ui\n\nimport androidx.compose.material3.MaterialTheme\nimport androidx.compose.material3.Typography\nimport androidx.compose.runtime.Composable\n\n' +
      'private val XTypography = Typography(displayLarge = TextStyle(fontSize = 34.sp))\n\n' +
      '@Composable\nfun XTheme(content: @Composable () -> Unit) {\n    MaterialTheme(\n        typography = XTypography,\n        content = content,\n    )\n}\n',
  });
  ownScale.length === 1 && /KraftTypeScale/.test(ownScale[0].message)
    ? ok('a scale that restates the numbers instead of using the tokens is caught')
    : bad(`a restated scale was not caught: ${JSON.stringify(ownScale.map((f) => f.message))}`);

  // A name the app does not define, in an app that does not consume the foundation: unresolvable.
  const unresolvable = scaleRun({
    'app/src/main/java/com/x/y/ui/Theme.kt':
      'package com.x.y.ui\n\nimport androidx.compose.material3.MaterialTheme\nimport androidx.compose.runtime.Composable\n\n' +
      '@Composable\nfun XTheme(content: @Composable () -> Unit) {\n    MaterialTheme(\n        typography = FromSomewhere,\n        content = content,\n    )\n}\n',
  });
  unresolvable.length === 1 && /cannot verify/.test(unresolvable[0].message)
    ? ok('an unresolvable typography name is reported rather than assumed')
    : bad(`an unresolvable name was not reported: ${JSON.stringify(unresolvable.map((f) => f.message))}`);

  process.stdout.write('\n' + '─'.repeat(64) + '\n');
  process.stdout.write(failures === 0
    ? '  selftest PASS\n'
    : `  selftest FAILED — ${failures} problem(s)\n`);
  return failures === 0 ? 0 : 1;
}

if (require.main === module) process.exit(run());
module.exports = { run };