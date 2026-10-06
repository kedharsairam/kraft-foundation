# Code Standards

Kotlin conventions for the portfolio. These are the rules that do not have a rule id,
because `kraft-lint` cannot decide them from source text — but they are still rules, and
review enforces them.

Anything a program can check belongs in `standards/standard.json`, not in this document. The
split is deliberate: this file is for judgement, that file is for the gate.

---

## Naming

**Files** — kebab-case. `ReduceMotion.kt`, `PulsePalette.kt`, `LoadResults.kt`. One public
type per file, named for the type. `KraftTokens.kt` is the single exception and it holds six
objects on purpose: they are one concept split across files for no benefit.

**Types** — PascalCase. Interfaces named for what they are or what they do, never with an
`I` prefix. `LoadResults`, not `ILoadResults`.

**Functions and properties** — camelCase. Backtick-quoted names only for Compose test
infrastructure (`\`a barometer reading\``), where the descriptive name is worth the noise.

**Booleans** — read as assertions. `isLoading`, `hasPermission`, `canRetry`, `shouldSync`.

This is the rule people skip. A boolean called `loading` is a noun; `isLoading` is a
statement, and a statement composes: `if (!hasPermission)`, `while (shouldSync)`. At a
call site the predicate form reads as English and the noun form does not.

**Constants** — `SCREAM_UTILS` for compile-time `const val`, `ScreenUtils` for a singleton
object. The capitalisation tells you whether the value exists at compile time, which is
usually the thing you need to know.

**Package names** — lowercase, no underscores, `com.krafttools.<app>`. The existing
packages break this in several apps (`core`, `ui`, `net` are fine; anything with an
underscore is not).

---

## Formatting

**Indent — 2 spaces.** No tabs. Not negotiable, because a mixed-indent diff is a diff nobody
reviews carefully and that is exactly where a bug hides.

**Line length — 120 characters.** Hard limit, not a suggestion. The `120` column is what
makes a side-by-side diff legible on a laptop and in a pull request.

**Trailing commas — always.** On every multi-line argument list, parameter list, collection
literal and type argument list. This is not decoration: it means adding or removing the
last element is a one-line diff instead of a re-indent of every line below it.

```kotlin
// With trailing commas, removing the last argument touches one line.
fun classify(
    bytesPerSec: Long,
    window: Duration,
    thresholds: Thresholds,
): Verdict
```

**Braces — K&R.** Opening brace on the same line as the declaration, always, including
single-statement bodies. The exception is `else`, which goes on its own line if the branch
has a brace.

```kotlin
fun classify(bytesPerSec: Long): Verdict {
    if (bytesPerSec <= 0) return Verdict.Idle
    return when {
        bytesPerSec < thresholds.slow -> Verdict.Poor
        bytesPerSec < thresholds.good -> Verdict.Fair
        else -> Verdict.Good
    }
}
```

No braces around a single statement. This is the one place I will argue both sides, because
"always brace" is a real convention and I still think consistency of shape matters more than
fewer characters here. Pick it, apply it everywhere in a file.

**Declaration order within a class** — public API first, then private implementation. A
reader should be able to stop reading after the public members and still know how to use the
class.

**Imports** — no wildcards. Explicit is better; Android Studio can sort them in one keystroke
and an unused import is a finding in most linters anyway. Order: `android.*`, then
`androidx.*`, then `com.*`, then `kotlin.*`, then `java.*`, then your own.

---

## Comments

**A comment explains WHY, never WHAT.**

```kotlin
// What: useless, the code says it.
// progress += delta * dt

// Why: the accumulator is clamped because a 10-second background pause delivers a delta
// large enough to push a rolling average to NaN, and NaN never recovers.
progress += (delta * dt).coerceAtMost(MAX_DELTA_SEC)
```

This is the standard with the highest ratio of talk to compliance, so the test is concrete:
if deleting the comment loses no information the code did not already carry, delete it.
`increment` does not need a comment saying it increments.

**The reasons worth writing down** are the ones the code cannot hold:

- Why a non-obvious constant is that number.
- Why an approach was chosen over the obvious alternative.
- Why something looks wrong and is not.
- What breaks if this changes.

Prefer a KDoc on the declaration over a comment inside the body — it is attached to the
thing it describes, IDEs surface it on hover, and it survives a line moving.

**Do not narrate, do not apologise, do not leave TODO without an owner.**

```kotlin
// Bad: TODO fix this
// Bad: this is ugly but works
// Bad: changed this in PR 412
// Good: the manifest's INTERNET permission exists only for the user-triggered update
//       check. The README's "fully offline" claim refers to features, not to this one
//       network call. See privacy.no-network-when-offline.
```

A TODO with no name attached is not a plan. If you cannot say who is doing it, it is a wish.

---

## Errors

**`Result<T>` over exceptions for expected failures.** Not `try`/`catch` on a domain path,
not a nullable return, not an out-parameter set to an error code.

Use `com.kraft.core.KraftResult` and `com.kraft.core.AppError` from `kraft-core`. They exist
so every app in the portfolio signals failure the same way, and so the error taxonomy is one
object rather than nine.

```kotlin
suspend fun load(query: String): KraftResult<List<Result>>   // not: List<Result>?
```

Import `KraftResult` explicitly. It is deliberately not the stdlib `Result`, and the two
shadow each other badly if you let them.

Exceptions remain correct for programmer errors — a genuinely impossible branch — and for
converting a `Throwable` at a data boundary with `toAppError()`.

Enforced by `arch.result-not-exception`, which is a warning rather than an error because most
of the portfolio predates the rule. The findings list is the adoption path.

---

## State

**Immutable by default.** `data class`, `val` everywhere, `copy()` for a transition. State
goes down, events go up.

**No global mutable state.** No top-level `var`, no object holding mutable state outside a
remembered scope. Enforced by `arch.no-global-mutable-state` at `error` severity, because
it is a race, an untestable path, and a bug nobody can reproduce.

Three lifetimes, three homes: `remember` for a recomposition, a `ViewModel` for an Activity,
DataStore for the process. There is no fourth place.

**One owner per piece of state.** If two things can write it, neither of them owns it.

---

## Functions

**Return early.** Nest no deeper than three levels. A function that needs a comment to
explain its nesting should be a function that returns early.

**Name for the effect, not the mechanism.** `loadResults()`, not `fetchAndParseAndCache()`.

**Keep the signature honest.** If a function needs five parameters of the same type, it
wants a value object — and a value object in domain code is a domain type, which is fine and
good.

**Side effects at the edges.** Pure logic in the middle, I/O at the boundaries. That is the
layering rule again, applied at the size of a function.

---

## Nullability

**No `!!`.** Zero tolerance. If a value is genuinely non-null, model it as non-null. If it
is not, handle the null. `!!` is a crash with extra steps and a worse stack trace.

**No bare `lateinit var` for anything a test touches.** It reads as convenient and behaves as
an `!!` deferred to a point you did not choose.

**No `Optional`.** Kotlin has a null and a `KraftResult`; a third state for "no value" is a
modelling problem, not a type problem.

---

## Concurrency

**Inject dispatchers.** Never hardcode `Dispatchers.IO` in a class that a test needs to
control. Take a `CoroutineDispatcher` as a constructor parameter with a default; the test
passes a test dispatcher and the test stops being a race.

**Structured concurrency only.** No `GlobalScope`. If work should outlive a scope, that is a
lifecycle decision the scope owner makes, not something the worker does for itself.

**No blocking calls on the main thread.** No `Thread.sleep`, no `runBlocking` outside tests,
no file or network I/O in a `@Composable` or a `ViewModel` body.

---

## Commits

**Conventional Commits**, imperative mood.

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `chore`, `style`.

```
feat(trainkraft): add live platform board refresh
fix(kalc): round half-up instead of half-even on division
refactor(kraft-ui): extract MotionSpec from KraftSprings
build(kraft-foundation): pin Gradle 9.7.1 across the portfolio
docs(barokraft): declare INTERNET permission reason in manifest
```

Imperative, not past tense. "add", not "added" or "adds" — the subject is the commit, and
`git log --oneline` should read as a list of instructions.

The scope is the module. It matters more than it looks: with nine apps and a shared library
in the same history, `fix: ...` tells you nothing about what to revert.

Body, when the reason is not obvious from the subject, explains why. Not what changed — the
diff says that.

One logical change per commit. The foundation's rule 2 is the same discipline applied to
extraction: extract, then rewire, as two commits, because one commit that does both is one
you cannot revert.

---

## Review

**Every rule id in a waiver is a conversation.** `@kraft-lint-ignore` requires the rule id and
a reason after the dash. A waiver without a reason is itself an error-severity finding,
because an unexplained exception is indistinguishable from a bug.

**Prefer fixing to waiving.** Waivers are for optical exceptions and one-off component
metrics — a 1dp hairline, a 2.5dp drag handle. If a waiver count in a file starts growing,
the design is wrong, not the waiver.

**"I'll add a test after" means the test does not exist.** Add it in the same commit or say
in the PR description why not, with a date.

---

## What this document does not cover

Anything `kraft-lint` can decide. Raw dp and sp literals, spacing values, corner radii,
colour literals, accent declaration, duplicate palettes, layer imports, Android imports in
domain, global mutable state, permission justifications, telemetry dependencies, secrets,
toolchain versions, README claims, CI configuration. Those live in
`standards/standard.json` with an id and a severity, and the gate runs them.

The reason for the split is not tidiness. Prose that nothing reads is an aspiration; a file a
program reads on every commit is enforcement. This document is what you read to understand
why, and `standards/standard.json` is what actually bites.
