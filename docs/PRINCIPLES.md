# Principles

Ten. In this order. The order is the argument — read it as one and the sequence makes
sense; reshuffle it and the sequence stops making sense.

Each principle has a statement and a prohibition, because a principle that only says
what to do gives you nothing to argue against in review.

---

## 1. Zero Trust

**Means:** nothing is trusted implicitly. Not a permission, not a network response, not
a cached file, not a function argument, not your own UI state. Every boundary validates;
every claim is checked rather than assumed; every component takes exactly what it needs
and nothing more.

**Forbids:** trusting input because of where it came from. A parsed response validated in
the data layer and again in the domain layer is not duplication, it is the design
working. Also forbids implicit ambient state — a composable that reads a global instead of
taking a parameter cannot be tested, previewed, or reused.

**Why first:** everything below depends on it. Robustness, security and testability are
all special cases of not assuming. Privacy is not — privacy is a choice, and it is
principle 5.

---

## 2. Lightweight

**Means:** the smallest thing that fully does the job. Small in dependencies, small in
files, small in abstractions, small in surface area. A token instead of a literal. A
composable instead of a framework. One dependency that does five things instead of five
that do one.

**Forbids:** dependencies added to avoid writing twenty lines. Speculative
generality, base classes nobody extends, abstractions with exactly one implementation in
the portfolio. Also forbids carrying app logic in shared code
(`build.library-no-app-logic`) — the shared layer that stops being shared is the most
expensive thing in the portfolio.

**Why second:** weight is the failure mode that hides inside every other success. It
never shows up as an incident; it shows up eighteen months later as a build nobody can
move.

---

## 3. Robust

**Means:** the app does the right thing when the world is wrong. Malformed input, empty
lists, rotation mid-write, a 500 response, a full disk, a locale it has never seen. Every
path has a defined outcome, including the paths you would rather not think about.

**Forbids:** crashes as a normal outcome. Unhandled exceptions on domain paths
(`arch.result-not-exception`). Silent fallbacks that swallow the error and show an empty
screen, because an empty screen is indistinguishable from a real empty screen.

---

## 4. Reliable

**Means:** the same input produces the same output, and the app keeps working when it
cannot produce that output. Deterministic logic, state that cannot be mutated behind your
back, and a clear line between "this failed" and "this is empty".

**Forbids:** global mutable state (`arch.no-global-mutable-state`). Mutable state outside
a remembered scope. Order-dependent behaviour that passes in a test and fails in a
process restart.

**Distinct from Robust:** Robust handles bad input. Reliable handles the *same* input
repeatedly. A crash is a robustness failure; a different answer each time you ask is a
reliability failure. Both are bugs.

---

## 5. Secure

**Means:** the app asks for nothing it does not need, holds no secret in source
(`privacy.no-hardcoded-secrets`), sends nothing anywhere, and ships no telemetry of any
kind (`privacy.no-telemetry`). Every declared permission has a written reason
(`privacy.permission-justified`) — the default answer to "why does this app want
location" is "it doesn't".

**Forbids:** analytics SDKs, crash reporters, ad networks, and the "we'll remove it
before release" plan. The allow-list is empty and stays empty.

**Why fifth, not first:** security is not the ordering constraint here — privacy is.
These two rarely conflict in a portfolio like this, and where they might, "the user's data
is the user's" wins.

---

## 6. Accessible

**Means:** usable without sight, without fine motor control, without motion, and without
a colour-independent way of telling two states apart. 44dp minimum touch target
(`a11y.touch-target`), a semantic label on every icon-only control
(`a11y.content-description`), every animation reachable through the reduce-motion
preference (`a11y.reduce-motion`), text contrast at 4.5:1.

**Forbids:** meaning carried by colour alone. Animated anything that ignores the user's
system preference. A control a screen reader cannot name.

---

## 7. Offline-First

**Means:** the app's core function works with no network and no account. Network is an
enhancement with a documented failure mode, never a precondition. If a README says
"fully offline", the manifest must not contradict it
(`privacy.no-network-when-offline`).

**Forbids:** a feature that is unavailable offline without being labelled as such. A
spinner where a cached answer exists. A login gate in front of local functionality.

---

## 8. Predictable

**Means:** state moves down, events move up. Immutable state, one place that owns it, no
hidden writes. The user sees what is happening and can account for it.

**Forbids:** a component that mutates state it does not own. UI that changes for reasons
the code does not express. Surprise.

---

## 9. Battery-Conscious

**Means:** the app is not awake when it does not need to be. Polling only when the user
is watching. Work batched and deferred. No wakelocks held for a convenience.

**Forbids:** a background timer that exists because it was easier than an event. Work
repeated on every frame that could be done once per change.

---

## 10. Testable

**Means:** domain logic is pure Kotlin with no Android imports (`arch.domain-pure`), so it
runs on the JVM in milliseconds. Every domain package has a test package
(`quality.tests-exist`). Shared code carries its own tests
(`build.library-has-tests`).

**Forbids:** domain code that needs Robolectric to exercise. A screen-level test standing
in for a domain test. Logic written where it can only be reached through a UI gesture.

**Why last:** it is not the least important — it is the least *constraining*. Everything
above it is a promise to the user. This one is a promise to the next developer, and
principles 1, 3 and 4 are what make it cheap to keep.

---

## How the order resolves a conflict

When two principles disagree in review, the earlier one wins. Concretely:

- Lightweight (2) against Reliable (4): keep the dependency. Reliability is not negotiable.
- Lightweight (2) against Testable (10): if the extra dependency is only saving you test
  setup, it is not saving you anything.
- Robust (3) against Battery-Conscious (9): do the work now, correctly. Deferred work
  that lies about freshness is a robustness failure wearing a battery costume.
- Secure (5) against Accessible (6): accessibility features that require an extra
  permission do not get the permission. Ship the accessible feature; find another way.

Zero Trust (1) is not really in contention with anything. It is the rule the other nine
are interpreted through.
