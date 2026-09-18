# kraft-ui — Kraft Foundation

Shared design system + core utilities for all Kraft Android apps.

```
kraft-ui/                  ← this repo (multi-module)
  ├── kraft-ui/            ← design system (Compose)
  │     ├── tokens/        ← KraftColors, KraftSpacing, KraftRadius, KraftIconSize, KraftTypeScale, KraftConstants
  │     ├── theme/         ← KraftColorSchemes (light + dark), KraftTypography, KraftTheme
  │     ├── motion/        ← rememberReduceMotion, KraftSprings
  │     └── components/    ← KraftTabBar, KraftTopBar, EmptyState, ErrorState
  └── kraft-core/          ← pure Kotlin, no UI
        ├── AppError       ← typed error hierarchy (Network / Data / Storage / Auth / Unknown)
        └── KraftResult    ← Success / Failure wrapper + fold/map/onSuccess/onFailure + Throwable.toAppError()
```

## Rules

1. **Extract, don't invent.** Something enters the foundation when the *second* app needs it.
2. **Two commits.** Extract to foundation → rewire the app. App must build green using the library version.
3. **Foundation carries its own tests.** Shared code is verified code.
4. **No app logic here.** No train names, no wallpaper names, no API endpoints. Generic primitives only.
5. **Tokens over literals.** Screens reference tokens, never raw dp/sp/hex.

## Consuming (composite build, no publishing)

In the app's `settings.gradle.kts`:

```kotlin
includeBuild("../kraft-ui")
```

In the app's `app/build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.kraft:kraft-ui")
    implementation("com.kraft:kraft-core")
}
```

No Maven, no versioning overhead. Edit the library, rebuild the app.

## Status

- v0.1.0 — Extracted from WallKraft (tokens, theme, motion, tab bar, top bar, empty/error states) + Result/AppError. First consumer: TrainKraft redesign.

## License

[MIT](LICENSE)
