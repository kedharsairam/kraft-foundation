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
    { id: 'type.scale-declared', line: 'KraftTheme(typography = Typography())', want: /stock Typography/ },
    { id: 'type.m3-wrapper-present', line: 'setContent { Box(Modifier.fillMaxSize()) }', want: /no MaterialTheme wrapper/ },
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

  // A clean app must exit 0, or the gate is not usable as a blocking check.
  const clean = fs.mkdtempSync(path.join(os.tmpdir(), 'kraft-lint-clean-'));
  fs.mkdirSync(path.join(clean, 'app', 'src', 'main', 'java', 'com', 'x', 'y'), { recursive: true });
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
  const mixedRun = lint([mixed, '--format', 'json']);
  let mixedJson = { findings: [], waived: [] };
  try { mixedJson = JSON.parse(mixedRun.out); } catch { /* reported below */ }
  const malformed = mixedJson.findings.filter((f) => String(f.rule).startsWith('waiver.'));
  malformed.length === 0
    ? ok('no false waiver.malformed in a file a whole-file rule also reads')
    : bad(`${malformed.length} spurious waiver.malformed finding(s): ${JSON.stringify(malformed.map((m) => m.line))}`);

  const waivedHere = mixedJson.waived.filter((f) => f.rule === 'spacing.no-raw-dp');
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
  fs.mkdirSync(path.join(noisy, 'app', 'src', 'main', 'java', 'com', 'x', 'y'), { recursive: true });
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
  fs.rmSync(noisy, { recursive: true, force: true });

  fs.rmSync(mixed, { recursive: true, force: true });
  fs.rmSync(fixture, { recursive: true, force: true });
  fs.rmSync(clean, { recursive: true, force: true });

  process.stdout.write('\n' + '─'.repeat(64) + '\n');
  process.stdout.write(failures === 0
    ? '  selftest PASS\n'
    : `  selftest FAILED — ${failures} problem(s)\n`);
  return failures === 0 ? 0 : 1;
}

if (require.main === module) process.exit(run());
module.exports = { run };