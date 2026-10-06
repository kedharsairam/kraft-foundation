# Architecture

Three layers. One direction. Everything else in this document is a consequence of taking
that seriously.

```
PRESENTATION  →  DOMAIN  →  DATA
   (Compose)      (pure)    (network, disk, prefs)
```

Arrows mean "depends on". Never the reverse, and never presentation from data.

---

## The three layers

### PRESENTATION

Everything the user can see or touch. Composables, `ViewModel`, `UiState`,
navigation. It reads state and emits events. It knows what a screen looks like and
nothing about where the answer comes from.

The presentation layer may not import from `data` directly. Ever.

### DOMAIN

The rules of the app — the part that would still make sense if the screen were deleted.
Pure Kotlin. **No `android.*`, no `androidx.*`, no Compose.** No `Context`, no `Handler`,
no `SharedPreferences`, no `Dispatchers.Main`.

This is not an aesthetic preference. It is the reason `arch.domain-pure` exists, and it is
the only reason some apps in this portfolio can test their domain logic on the JVM in
milliseconds while the rest need Robolectric. barokraft and trainkraft can test theirs.
`VerdictTest`, `SeaLevelTest`, `NowcastTest` — plain JVM, no emulator, no shadow framework,
no `Looper`.

### DATA

Everything that can fail for reasons outside the app's logic. HTTP clients, Room, DataStore,
file I/O, sensors. It knows how to talk to the outside world and nothing about what the
data means.

Data may import domain (it implements domain's interfaces). Presentation may import domain.
Nothing imports presentation.

---

## `arch.layering` — severity: error

**Presentation must not be imported by data. Domain must import neither.**

The check reads source imports and is unforgiving about it, which is the point. A
dependency graph that can be verified by reading import lines is a dependency graph you can
verify; an "architectural" convention held together by code review is held together until
the review is skipped.

The rule that bites in practice is presentation-from-data, because it is easy to do by
accident: a `@Composable` helper that needs one more field off a DTO, imported "just this
once". By the fourth time, the data layer is rendering UI and the domain layer is optional.

If presentation needs something from data, that something is a domain type. If data
produces something presentation needs, that something is also a domain type. Data
translates; it does not leak.

---

## `arch.domain-pure` — severity: error

No `android.*`, `androidx.*` or Compose import in a domain source file.

The evidence for why this rule is worth an `error`: it is what makes a domain layer
testable without Robolectric, which is why barokraft and trainkraft can test theirs and
most of the portfolio cannot. The other apps are not less rigorous. They are slower, by
orders of magnitude, and their tests get skipped.

What you lose by staying pure is small and mostly imaginary:

- **`Dispatchers.Main`** — inject a `CoroutineDispatcher`. You need to anyway, for testing.
- **`Context`** — you wanted a `Context` in domain code, you wanted an abstraction you did
  not have.
- **`java.**`**`time`** — this is the one real cost on older API levels, solved by
  desugaring, and it is worth paying. `Instant`, `Duration` and `ZoneId` are the vocabulary
  of time-domain
  logic and they belong in domain code. wallkraft and kalc both depend on domain logic that
  does arithmetic on rates and windows; none of it needs an Android runtime to run.

---

## State is immutable, and state goes down / events go up

Every screen has exactly one owner of state. It is a `data class`. Nothing mutates it.

```kotlin
// Presentation. The whole contract.
data class HomeUiState(
    val results: List<Result> = emptyList(),
    val loading: Boolean = false,
    val error: AppError? = null,
)

sealed interface HomeEvent {
    data object Refresh : HomeEvent
    data class QueryChanged(val text: String) : HomeEvent
}
```

- **State goes down.** A composable reads `state` and renders it. It never writes.
- **Events go up.** A composable emits `HomeEvent` and forgets. It never calls the
  repository.

This is what makes the UI testable without a device, what makes preview work, and what
makes "why did this screen show this" answerable by reading one file. It is also
principle 8, Predictable, and the two are the same rule stated in different vocabularies.

Use `copy()` for a state transition, and let the state class decide whether the change is
legal. A state object that can reach an invalid configuration is not a state object.

---

## `arch.no-global-mutable-state` — severity: error

A top-level `var`, or an object holding mutable state, outside a remembered scope.

Predictable state, or there is none.

The check is small — top-level `var` and mutable holders — and it is enough, because the
things it misses are caught by the layering rule above. A global can be *read* freely;
what cannot cross the line is being *written* somewhere no call site can point at.

Why it is an `error` and not a warning: global mutable state is not a style problem. It is
a race, an untestable path, and a reason a bug cannot be reproduced. There is no version of
this rule where I want it advisory.

State that must outlive a recomposition lives in `remember`, state that must outlive an
Activity lives in a `ViewModel`, and state that must outlive a process restart lives in
DataStore. There is no fourth place.

---

## `arch.result-not-exception` — severity: warn

Throws of `IllegalStateException` or `IllegalArgumentException` on domain paths are
findings.

Expected failures come back as a value. `kraft-core` already provides the types:
`KraftResult` and `AppError`.

```kotlin
sealed class KraftResult<out T> {
    data class Success<T>(val data: T) : KraftResult<T>()
    data class Failure(val error: AppError) : KraftResult<Nothing>()
    // map, fold, onSuccess, onFailure, getOrNull, errorOrNull
}
```

`AppError` is a shallow sealed hierarchy with four buckets plus a fallback:

- `NetworkError` — `NoConnection`, `Timeout`, `ServerError`, `RateLimited`
- `DataError` — `Parse`, `Validation`, `NotFound`
- `StorageError` — `DiskFull`, `PermissionDenied`
- `AuthError` — `Unauthorized`, `Expired`
- `Unknown(throwable, message)` — the fallback; callers do not branch on it

Four buckets is deliberate. Deep hierarchies of errors get extended instead of collapsed,
and after four releases every app has its own private vocabulary. Raw exceptions and HTTP
codes stay inside the data layer.

At the data boundary, `Throwable.toAppError()` converts an exception into a typed error
once, and everything above the boundary works with `AppError` only.

### Exceptions are still for the exceptional

`Result` is for failures that are **expected** — no connection, disk full, a 404, an invalid
input the user typed. Those are not exceptional. They are Tuesday. Throwing for them makes
every caller a try/catch block, makes the failure paths invisible to the type checker, and
puts the handling decision in the wrong place.

Exceptions are correct for: a programmer error you cannot reasonably recover from
(`IllegalStateException` on a genuinely impossible branch), and failures at the top of a
`runCatching` that is about to be logged and converted.

**Warn, not error.** Because most of the portfolio has domain layers written before this
rule existed, and a rule that fails the build on the entire existing portfolio gets deleted
rather than adopted. The finding list is the adoption path. It will be promoted when the
backlog is empty.

### Import it explicitly

`KraftResult` is deliberately distinct from the stdlib `Result`, and the two shadow each
other badly if you let them. Always:

```kotlin
import com.kraft.core.KraftResult
```

---

## `type.m3-wrapper-present` — severity: error

**Every Activity's `setContent` must be wrapped in `MaterialTheme`.**

This rule is in the architecture document because the failure it prevents is architectural,
not cosmetic. Read what happens when the wrapper is missing.

barokraft's `setContent` is:

```kotlin
setContent {
    val state = viewModel.state
    Box(Modifier.fillMaxSize().background(Ink))   // no MaterialTheme
}
```

Now consider every line in that app that reads:

```kotlin
MaterialTheme.colorScheme.primary
MaterialTheme.typography.bodyLarge
MaterialTheme.shapes.medium
```

**None of them fail.** They compile. They resolve — to Material's *default* values. So the
app gets a real background from `Ink` and default-Material blue for every accent, default
Roboto metrics for every style, default 4dp-ish shapes for every corner. The app is
inconsistent with itself, and nothing in the build reports it: no compiler error, no
runtime exception, no lint finding, no crash. It is the worst class of bug — the kind where
the failure is invisible to every tool you own.

The correct form:

```kotlin
setContent {
    KraftTheme(darkTheme = isSystemInDarkTheme()) {
        BaroApp()
    }
}
```

`KraftTheme` supplies `KraftColorSchemes.Light` or `KraftColorSchemes.Dark` plus
`KraftTypography.Typography`. Its `darkTheme` parameter defaults to
`isSystemInDarkTheme()`, and TrainKraft passes `darkTheme = true` because it is dark-only —
which is exactly what the parameter is for.

Related, and in the same family: `type.scale-declared` fails a bare `Typography()`. Both
rules are about the theme being *wired*, because an unwired theme fails silently in both
directions.

---

## The shared foundation, and how an app gets it

### `build.uses-shared-library` — severity: error

`settings.gradle.kts` must `includeBuild` the foundation with `dependencySubstitution`.

Eight of nine apps defined their own theme while the shared library existed and was used by
one. This rule is the whole reason the portfolio looks like one body of work: it makes
*not consuming the library* a build failure rather than an oversight.

```kotlin
// settings.gradle.kts
includeBuild("../kraft-foundation")
```

```kotlin
// app/build.gradle.kts
dependencies {
    implementation("com.kraft:kraft-ui")
    implementation("com.kraft:kraft-core")
}
```

Composite build, no publishing, no Maven, no version numbers. Edit the library, rebuild
the app. `docs.standards-present` covers the other half: the README must link the
foundation and name the version it targets.

### `build.library-has-tests` — severity: error

Both modules must have a test source set and a non-empty suite.

The foundation's own rule 3: *"Foundation carries its own tests. Shared code is verified
code."* kraft-ui had none, which is a large part of why nobody trusted it enough to adopt.
A gate cannot meaningfully police a library that does not police itself — every downstream
app inherits untested primitives and no signal that they are untested.

### `build.library-no-app-logic` — severity: error

No network, cache, API or widget constant in the foundation. Anything app-shaped must be
genuinely generic or moved out.

This one is currently failing, on purpose, as a worked example. `KraftConstants` in
`KraftTokens.kt` holds `SearchCacheTtlMs = 30 * 60 * 1000L`, `CallTimeoutSec = 30L`,
`RateLimitCooldownMs = 60_000L`, and `GridPrefetchAhead = 4` — network and search concerns
from wallkraft, now load-bearing for every app that adopts the library.

The mechanism matters more than the instance. A constant in the shared layer gets *used*,
so the next app that needs a token finds the precedent and adds to it. There is no review
step between "one reasonable constant" and "the shared layer is a bag of one app's
decisions". The foundation's rule 4 says no train names, no wallpaper names, no API
endpoints. `SearchCacheTtlMs` is a wallpaper name with a number attached.

What belongs there: genuinely generic primitives — spacing, type, radius, colour tokens,
`AppError`, `KraftResult`, motion springs, components. What does not: anything you could
name after an app.

---

## The foundation's own rules

From `kraft-ui/README.md`, because a library that does not hold itself to a standard cannot
hold anything else to one:

1. **Extract, don't invent.** Something enters the foundation when the *second* app needs it.
2. **Two commits.** Extract to the foundation, then rewire the app. The app must build green
   against the library version. One commit that does both is one you cannot revert.
3. **Foundation carries its own tests.** See `build.library-has-tests`.
4. **No app logic here.** See `build.library-no-app-logic`.
5. **Tokens over literals.** See `spacing.no-raw-dp` and `type.no-raw-sp` in DESIGN.md.

Rule 1 is the one that gets violated under deadline, and it is the one that decides whether
this foundation stays a foundation. Nine apps is not two apps; a token extracted for the
second app *and* found useful by the fifth is not over-abstraction, it is the reason the
thing exists.

---

## Why pure Kotlin in the middle

The reason to have a layer that cannot see either neighbour is that it is the only layer
whose correctness you can check without a device.

The domain is where the app's rules live: what counts as a good reading, whether a rate is
acceptable, when a window is stale. Those are decisions worth being certain about, and they
are the decisions most likely to be quietly rewritten by someone who thinks they are
tidying up a helper. A rule that lives in pure Kotlin cannot acquire a `Context` by
accident. `arch.domain-pure` is what keeps that true six months later.

The layering rule is the other half: without it, purity is a local habit that erosion
undoes. Data importing presentation is not a style violation, it is the end of the domain
layer as a thing you can reason about — and it happens by import, one line at a time,
without anyone deciding to do it.

---

## What a screen looks like, all three layers together

```kotlin
// PRESENTATION — owns the state, emits events, renders.
@Composable
fun HomeScreen(vm: HomeViewModel = viewModel()) {
    val state by vm.state.collectAsStateWithLifecycle()
    KraftTheme {
        Column(Modifier.padding(KraftSpacing.ScreenEdge)) {
            when {
                state.loading -> ShimmerList()
                state.error != null -> ErrorState(onRetry = { vm.on(HomeEvent.Refresh) })
                else -> ResultList(state.results) { vm.on(HomeEvent.QueryChanged(it)) }
            }
        }
    }
}

// DOMAIN — pure Kotlin. No imports that know about Android.
class HomeViewModel(private val load: LoadResults) {   // interface from domain
    private val _state = MutableStateFlow(HomeUiState())
    val state = _state.asStateFlow()
    fun on(event: HomeEvent) { /* exhaustive when, copy() into _state */ }
}

// DOMAIN — the rule, expressed once, testable on the JVM.
class RatePolicy(private val thresholds: Thresholds) {
    fun classify(bytesPerSec: Long): Verdict = /* ... */
}

// DATA — implements the domain interface. Translates exceptions once.
class NetworkLoadResults(private val client: Client) : LoadResults {
    override suspend fun load(query: String): KraftResult<List<Result>> =
        runCatching { client.search(query) }
            .fold(onSuccess = { it.asSuccess() }, onFailure = { it.toAppError().asFailure() })
}
```

Every arrow points one way. Every failure is a value on the way up. The domain rule
compiles without the Android framework jars on the classpath, which is the definition of the
whole design.
