/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 *
 * Coverage: which rules this linter actually decides, and which it does not.
 *
 * This file exists because a gate that overstates itself is worse than no gate. If kraft-lint
 * claims to check twenty-nine rules and quietly checks twenty, every one of the nine is a rule
 * the portfolio believes is enforced and is not. So the split is declared here, published in
 * every run's summary line, and enforced by selftest.js: a rule in standard.json that appears
 * in neither list fails the selftest.
 *
 * A MANUAL entry carries a reason, because "cannot be automated" is only useful if it says
 * why, and because a rule nobody can check should be a candidate for deletion rather than a
 * permanent exception.
 */

'use strict';

// ── Implemented ───────────────────────────────────────────────────────────────────────────

const AUTOMATED = [
  'spacing.no-raw-dp',
  'spacing.rhythm',
  'type.no-raw-sp',
  'type.scale-declared',
  'type.m3-wrapper-present',
  'radius.from-token',
  'colour.per-app-declared',
  'arch.domain-pure',
  'arch.result-not-exception',
  'arch.no-global-mutable-state',
  'privacy.no-hardcoded-secrets',
  'privacy.no-telemetry',
  'privacy.permission-justified',
  'privacy.no-network-when-offline',
  'build.uses-shared-library',
  'build.library-has-tests',
  'build.library-no-app-logic',
  'quality.tests-exist',
  'quality.ci-runs-the-gate',
  'quality.ci-runs-tests',
  'quality.toolchain-uniform',
  'docs.standards-present',
];

// ── Not automated, with reasons ────────────────────────────────────────────────────────────

const MANUAL = {
  'a11y.touch-target':
    'A clickable element\'s resolved size depends on its runtime layout — constraints, ' +
    'parent bounds, and composition order. Deciding 44dp from source text means modelling ' +
    'the Compose layout pass, and a check that guesses is worse than none. Belongs in an ' +
    'instrumented test on a real device, or a screenshot audit.',

  'a11y.reduce-motion':
    'Whether an animation respects the preference is a question about control flow through ' +
    'rememberReduceMotion, and in Kotlin that is not decidable from text. A lint rule can ' +
    'check that the helper is imported and used somewhere; it cannot prove every animation ' +
    'passes through it.',

  'a11y.content-description':
    'A label can be a string literal, a string resource, or computed, and an icon-only ' +
    'control may be correctly labelled by a surrounding semantics block rather than its own ' +
    'contentDescription. Deciding this needs the merged semantics tree at runtime.',

  'colour.accent-per-app-allowed':
    'This rule is satisfied by the absence of a fault — it asks that a difference be declared ' +
    'rather than accidental, and the declaration is a comment. It is reported as information ' +
    'by hand during a palette review, not by this tool.',

  'tokens.no-duplicate-palette':
    'Needs every app in the portfolio at once, so it runs as a portfolio-wide sweep rather ' +
    'than per-app. Implemented in tools/kraft-lint/sweep-palettes.js, not in the per-app path.',

  'arch.layering':
    'Package names do not reliably correspond to layers across nine apps written over seven ' +
    'months — some use presentation/, some ui/, some screen/. Deciding direction of import ' +
    'would encode a naming convention the portfolio has not agreed on, and a check for an ' +
    'unagreed convention produces findings nobody can act on.',

  'docs.accessibility-noted':
    'Conditional on README wording and on the a11y rules passing; it is a judgement about ' +
    'whether a claim is overstated, which is a review, not a check.',
};

module.exports = {
  AUTOMATED,
  MANUAL,
  COVERAGE: { automated: AUTOMATED, manual: Object.keys(MANUAL) },
};