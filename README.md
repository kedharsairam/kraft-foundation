# kraft-foundation

**The standard, the design system, and the gate that keeps them true.**

One repository, because they are one thing. The documents explain what a Kraft app is, the
library is how it looks and how its errors are shaped, and `kraft-lint` is what stops either
from drifting away from the other.

```
kraft-foundation/
├── docs/                 the standard, as prose
│   ├── MANIFESTO.md          what this is, and what it refuses
│   ├── PRINCIPLES.md         ten, in priority order
│   ├── DESIGN.md             the visual language
│   ├── ARCHITECTURE.md       PRESENTATION → DOMAIN → DATA
│   ├── STANDARDS.md          Kotlin conventions
│   └── CHECKLIST.md          the pre-release gate
├── standards/
│   └── standard.json      the rules a program can read — the enforcement source
├── kraft-ui/              the design system: tokens, theme, motion, components
├── kraft-core/            pure Kotlin: KraftResult, AppError
├── tools/
│   ├── kraft-lint/        the gate
│   └── sweep-palettes.js  portfolio-wide duplicate-palette check
└── templates/
    └── android-app/       a new app, already compliant
```

## Why it is one repository

These were three things in three places, and the three places disagreed. The standards lived
in a repository that was deleted and survived only as a reconstruction inside one app; the
design system was used by one app out of nine; the checklist had forbidden a manifest
permission since before any of these apps existed and nothing checked.

The rule that kept the library empty is its own first rule — *extract to the foundation when
the second app needs it* — which is a good rule for avoiding premature abstraction and a
guarantee that nothing is ever a second use across nine apps built independently. Every app was
the first app to need a theme. So eight of them wrote their own, and the portfolio came to
look like nine unrelated products.

## How a decision becomes binding

```
docs/DESIGN.md            explains a rule, and cites its id
standards/standard.json   defines that id, its severity, and what the check is
tools/kraft-lint/         implements the check, or lists the rule as MANUAL with a reason
```

`kraft-lint --selftest` fails if a rule has no prose behind it, if a document cites a rule that
does not exist, if a rule is neither implemented nor explained, and if a check never fires on a
fixture built to break it. That last one is the part most gates skip: a check that has never
been seen to fail is not known to work.

## Using it

In an app's `settings.gradle.kts`:

```kotlin
includeBuild("../kraft-foundation") {
    dependencySubstitution {
        substitute(module("com.kraft:kraft-ui")).using(project(":kraft-ui"))
        substitute(module("com.kraft:kraft-core")).using(project(":kraft-core"))
    }
}
```

Then in `app/build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.kraft:kraft-ui")
    implementation("com.kraft:kraft-core")
}
```

In CI:

```yaml
- name: Quality gate
  run: node tools/kraft-lint/kraft-lint.js . --format github
```

## What the gate does and does not decide

Twenty-two of the twenty-nine rules are decided by reading source. Seven are not, each for a
stated reason, and the list is in `tools/kraft-lint/rules/coverage.js`. Every run prints the
ratio.

That split is the point. A gate that claims twenty-nine when it checks twenty-two leaves seven
rules the portfolio believes are enforced and are not — which is the state this repository was
in when it was three repositories.

## Licence

MIT. `docs/` and `standards/` are the part meant to be read by anyone; the library is the part
that makes reading it cheap.

## Support

<p align="center">
  <a href="https://buymeacoffee.com/kedhartech"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" width="182"></a>
</p>
