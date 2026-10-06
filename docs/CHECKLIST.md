# Release Checklist

A checklist nobody runs is a convention. gitakraft declares `android.permission.INTERNET`
while its own README says "Fully offline", and item 15 has forbidden that since the
checklist existed. Nothing checked.

Every item below corresponds to a rule in `standards/standard.json`, and `kraft-lint` is what
actually enforces the ones a program can decide. Items marked **[gate]** fail the build.
Items marked **[ci]** must be enforced by a workflow that blocks on its exit code — a check
you only run locally is a check that runs when you remember, and four apps in this portfolio
have no `.github` directory at all.

Items with no rule id are judgement, or need a human, or need a device. They are not
optional; they are just not automatable, and pretending otherwise is how a gate starts lying
about its coverage.

Run the whole thing before tagging a release. Not the sections you feel like.

---

## Code Quality

1. **[gate]** No `<number>.dp` in main source outside the exempt files, and every remaining
   one carries a waiver with a reason — `spacing.no-raw-dp`.
2. **[gate]** Every spacing literal is on 0, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56,
   64. Specifically: no 10, 13, 14, 18 or 26 — `spacing.rhythm`.
3. **[gate]** No `<number>.sp` in main source outside `**/ui/theme/**` — `type.no-raw-sp`.
4. **[gate]** The theme composable passes a `Typography` built from `KraftTypeScale`. No bare
   `Typography()` — `type.scale-declared`.
5. **[gate]** Every Activity's `setContent` is wrapped in `MaterialTheme` —
   `type.m3-wrapper-present`. Without it, colour and type references resolve to Material
   defaults silently.
6. **[gate]** No inline `RoundedCornerShape(<number>.dp)` outside the radius scale —
   `radius.from-token`. Review the findings: mark the deliberate optical ones with a waiver
   or fix them.
7. **[gate]** Every `Color(0x…)` outside the theme package resolves to a name declared in the
   app's palette — `colour.per-app-declared`.
8. **[gate]** The accent is declared in one palette object with a comment naming the reason —
   `colour.accent-per-app-allowed`. A divergence from the portfolio default is reported as
   information; it still has to be on the record.
9. **[gate]** No hex value is duplicated from another app without a stated reason —
   `tokens.no-duplicate-palette`. englishkraft and langkraft are the current example.
10. **[gate]** No `android.*`, `androidx.*` or Compose import in a domain source file —
    `arch.domain-pure`.
11. **[gate]** Presentation is not imported by data; domain imports neither — `arch.layering`.
12. **[gate]** No top-level `var`, no object holding mutable state outside a remembered scope
    — `arch.no-global-mutable-state`.
13. **[gate]** Expected failures on domain paths return `KraftResult`, not a throw —
    `arch.result-not-exception`. Triage the warnings; the backlog should be shrinking.
14. Every `@kraft-lint-ignore` in the diff carries a rule id and a reason after the dash. A
    waiver without a reason is itself an error-severity finding.

## Security

15. **[gate]** If the README or manifest claims offline operation, `INTERNET` is not declared
    — or is declared with a comment explaining why it is there —
    `privacy.no-network-when-offline`. gitakraft is the open finding: the manifest says
    internet, the README says "fully offline", and the build cannot say which is wrong.
16. **[gate]** Every `uses-permission` in `AndroidManifest.xml` has a comment giving the
    reason — `privacy.permission-justified`. The portfolio spans zero to eleven permissions;
    every one an app holds must be one it can name out loud.
17. **[gate]** No analytics, crash-reporting or advertising SDK in any dependency block or
    `libs.versions.toml` — `privacy.no-telemetry`. The allow-list is empty by design.
18. **[gate]** No secret in source: no key-shaped string, no password/token/api-key
    assignment with a literal value, across `.kt`, `.kts`, `.properties` and `.xml` —
    `privacy.no-hardcoded-secrets`.
19. Every `Activity`, `Service`, `Receiver` and `Provider` declares `android:exported`
    explicitly. Anything exported is intentionally public and documented as such.

## Testing

20. **[gate]** Every domain package has a corresponding test package with at least one test —
    `quality.tests-exist`. This is the item most often unmet: kalc has one test file,
    gitakraft three.
21. **[ci]** Domain tests run on a plain JVM. No `Robolectric`, no `@Config`, no emulator in
    any domain test. If a test needs one, the layer boundary has leaked —
    `arch.domain-pure`.
22. Every new public domain function has a test that fails when the function is removed.
23. No test depends on execution order, wall-clock time, or a real network. Inject a `Clock`
    and a dispatcher; a test that only passes at 3am is not a test.
24. No test is `@Ignore`d, no suite is silently skipped, and no test is retried until green.
25. Every bug fix ships with a test that reproduces the bug before the fix.
26. `./gradlew testDebugUnitTest` exits 0 locally. **Not "it passed earlier in the branch".**

## Performance

27. No I/O on the main thread. No `Thread.sleep`, no `runBlocking` outside tests.
28. No work performed in a `@Composable` body. Values that can be remembered or hoisted are.
29. Every list over roughly fifty items is lazy and provides stable `key`s.
30. Bitmap decode is bounded — `KraftConstants.MaxDecodeDim = 4096` — and images are sized to
    the display, not to the source.
31. No wakelock held without a user-visible reason. No foreground service left running after
    its work is done.
32. Cold start lands on useful content before any network call completes. This is
    Offline-First doing its job, not an optimisation.
33. Animations use `KraftSprings` presets rather than new specs invented per screen.

## Design

34. **[gate]** Every clickable element resolves to at least 44dp — `a11y.touch-target`. Where a
    platform component supplies more than 44dp, the more is kept. 44dp is a floor, not a
    target.
35. **[gate]** Every icon-only clickable has a `contentDescription` or a `semantics` block —
    `a11y.content-description`. The label says what the control does, not what it looks like.
    Where there is visible text, do not add a description that repeats it.
36. **[gate]** Every animation and transition is reachable through `rememberReduceMotion` —
    `a11y.reduce-motion`. Check it with Developer Options → Animator duration scale set to 0
    *and* with the accessibility toggle on API 31+.
37. Both light and dark schemes reviewed on a real device. No white-on-white, no invisible
    separators, no state carried by colour alone.
38. **[ci]** A workflow runs `testDebugUnitTest` and blocks on its exit code —
    `quality.ci-runs-tests`.

## Build & Release

39. **[ci]** A workflow invokes `kraft-lint` and blocks on its exit code —
    `quality.ci-runs-the-gate`.
40. **[gate]** `settings.gradle.kts` includes the foundation with `dependencySubstitution`, and
    the app resolves `com.kraft:kraft-ui` and `com.kraft:kraft-core` through it —
    `build.uses-shared-library`. Eight of nine apps defined their own theme while the library
    existed and was used by one.
41. **[gate]** Both `kraft-ui` and `kraft-core` have a test source set and a non-empty suite —
    `build.library-has-tests`. Shared code is verified code; a gate cannot meaningfully police
    a library that does not police itself.
42. **[gate]** No network, cache, API or widget constant in the foundation —
    `build.library-no-app-logic`. `SearchCacheTtlMs`, `CallTimeoutSec` and
    `RateLimitCooldownMs` in `KraftConstants` are the current findings: wallkraft's decisions,
    load-bearing for everyone.
43. **[gate]** Gradle wrapper and AGP versions reported and reconciled against the portfolio
    mode — `quality.toolchain-uniform`. Seven apps are on 9.7.1 / 9.3.1 and two on
    8.11.1 / 8.9.1. Not a bug; a divergence worth removing rather than documenting.
44. `versionCode` incremented. `versionName` matches the tag, without a `-rc` or `-beta`
    suffix in a release build.
45. **[gate]** No secret in the release configuration. Signing material comes from the
    environment or a git-ignored file — `privacy.no-hardcoded-secrets`.
46. R8/ProGuard rules updated for anything reflective. The release build is minified and
    resource-shrunk, and the shrunk APK is installed and smoke-tested before tagging.
47. CHANGELOG updated with what changed and, where it matters, what it means for the user.
48. The release tag matches the commit that passed the gate.

## Documentation

49. **[gate]** The README links the foundation and names the standard version it targets —
    `docs.standards-present`. At present no app does; the standards exist only as a
    reconstruction inside one app.
50. **[gate]** If the README claims accessibility, every a11y rule passes — for
    `a11y.touch-target`, `a11y.content-description` and `a11y.reduce-motion`. A claim that is
    not implemented is worse than no claim — `docs.accessibility-noted`.
51. The README's feature list matches what the app actually does. Every named screen exists;
    every named capability works offline unless the README says otherwise.
52. The README's permission claims match `AndroidManifest.xml`. No permission in the manifest
    is unmentioned; no permission in the README is undeclared.
53. New public API in `kraft-ui` or `kraft-core` has a KDoc stating the invariant it
    guarantees. Extracted on the second app's need, not the first's — README rule 1.

## Post-Release

54. Install the shipped artifact on a physical device, not an emulator. Cold start, first
    screen, one real interaction per primary feature.
55. Release notes say what changed and what a user should do about it, if anything.
56. Check the issue tracker 72 hours after release. No telemetry ships, so a user-reported bug
    is the only signal there is — read the tracker.
57. Anything waived during this cycle either got fixed or has an issue with an owner and a
    date. A waiver with no follow-up is a permanent exception wearing a temporary label.
58. The next release's copy of this checklist gained an item for anything this release
    violated and did not fix.

---

## What this gate does not cover

`kraft-lint` does not pretend to decide every rule from source text. A rule is either
implemented or listed as manual with a reason, and `kraft-lint --selftest` fails if a rule
is neither. The summary line reports the ratio, because a gate that claims to check
twenty-nine rules when it checks twenty is worse than one that counts.

Items 14, 19, 22–25, 27–33, 37, 44, 46–48 and 51–58 are not machine-checkable today. They
stay in the list because removing them would be removing the part that a person does, and
the person is the one holding the device.
