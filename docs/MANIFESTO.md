# Manifesto

Nine Android apps. One standard. The rules are in `standards/standard.json`, the
reasoning is in these six documents, and `kraft-lint` fails the build when the two
disagree.

A design standard, not a wish list. Every rule has an id, a severity, a rationale and a
check, and every rationale names something that went wrong — an app with 207 dp literals, a
README claiming "fully offline" beside a manifest asking for the internet, four apps with no
CI at all.

## What this standard is

A set of constraints small enough to hold in your head and strict enough to fail a
build.

**Privacy by default.** Zero permissions unless the app can name why it needs each one
(`privacy.permission-justified`). No telemetry, no analytics, no crash reporting, no ads
(`privacy.no-telemetry`) — the allow-list is empty by design. We do not treat the user's
device as a data source.

**Craft over shipping.** A type scale that can be overridden at the call site is not a
type scale. Shared code carries its own tests, or it does not enter the foundation.

**Offline-first.** If an app claims to work offline, the manifest had better not
disagree (`privacy.no-network-when-offline`). Features degrade; they do not require a
server.

**Testable.** Domain logic is pure Kotlin with no Android imports
(`arch.domain-pure`), which is the only reason some apps can test theirs without
Robolectric.

**Accessible.** 44dp minimum touch target, every icon-only control named for a screen
reader, every animation behind the reduce-motion preference.

**Lightweight.** Tokens, not literals. Layers, not tangles. Nothing shared that only one
app needs.

## What we do not

- We do not ship analytics. Not "temporarily", not "just for this release".
- We do not commit secrets. Not keys, not tokens, not API passwords.
- We do not add a dependency to fix something a token would fix.
- We do not let the shared library hold app logic. No train names, no wallpaper names,
  no API endpoints, no cache TTLs (`build.library-no-app-logic`).
- We do not make nine apps look identical. Colour is per-app by design; spacing, type,
  radius, motion, targets and components are shared.
- We do not accept an unexplained exception. A waiver needs a rule id and a reason, or
  it is a finding.

A checklist nobody runs is a convention. That is why the enforcement source is a file a
program reads on every commit, and not this prose.
