# New Kraft app — template

A starting point that is **already compliant**. Copy this directory, change the values marked
`CHANGE`, and the app consumes the shared foundation, declares the standard it targets, and has
a workflow that runs the gate.

## Why a template rather than a checklist

Because the checklist did not work. It has said "consume the shared design system" in effect
since before most of these apps existed, and eight of nine still define their own `Theme.kt`.
A rule that is written down and run by hand is a convention; the same rule in a file a new app
starts from is a default.

## What's here

```
settings.gradle.kts                              composite build on the foundation, plus the
                                                dependencySubstitution that makes it work
.github/workflows/ci.yml                        the gate and the tests, both blocking
app/src/main/java/com/example/newkraft/ui/
├── Theme.kt                                    the MaterialTheme wrapper and the type scale
└── Colors.kt                                   the accent, and the reason for it
```

## What you still have to write

The parts that depend on what the app *does*: `build.gradle.kts`, `AndroidManifest.xml`, the
screens, and a test for every domain class. The template deliberately stops at the boundary
where compliance stops being the interesting problem.

## Before your first commit

1. **Pick an application id.** In `settings.gradle.kts` and `app/build.gradle.kts`. Lowercase, no
   underscores — the gate and Android both care, and `privacy.no-hardcoded-secrets` reads a
   stray `password = "..."` as a credential.
2. **Choose an accent and write down why.** See `Colors.kt`. The comment is not decoration; it
   is what stops the next person "fixing" the difference between your app and its siblings.
3. **Run the gate.** `node ../kraft-foundation/tools/kraft-lint/kraft-lint.js .` — it should
   report nothing. If it does not, you have copied something wrong.

## The workflow needs the foundation as a sibling

```yaml
- uses: actions/checkout@v4
  with:
    repository: kedharsairam/kraft-foundation
    path: kraft-foundation
```

It is public, so no key is needed. An older workflow in this portfolio still carries a deploy key
for the same checkout; that key should be deleted.