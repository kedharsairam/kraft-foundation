# Design Language

Apple HIG-inspired, adapted to a portfolio of nine Android apps. The type scale is SF
Pro's sizes on the system font. The touch target is Apple's 44dp, not Material's 48dp.
The dark scheme is OLED-first and true black. Everything that makes two Kraft apps feel
like the same body of work is shared; the accent is the app's own.

Token source of truth: `kraft-ui/src/main/java/com/kraft/ui/tokens/KraftTokens.kt`.
Theme source: `kraft-ui/src/main/java/com/kraft/ui/theme/KraftTheme.kt`.

---

## 1. Spacing — the 8px rhythm

The scale is 8dp. Everything else is derived.

| Token | Value |
|---|---|
| `Spacing2` | 2dp |
| `Spacing4` | 4dp |
| `Spacing6` | 6dp |
| `Spacing8` | 8dp |
| `Spacing12` | 12dp |
| `Spacing16` | 16dp |
| `Spacing20` | 20dp |
| `Spacing24` | 24dp |
| `Spacing32` | 32dp |
| `Spacing40` | 40dp |
| `Spacing48` | 48dp |
| `Spacing56` | 56dp |
| `Spacing64` | 64dp |

The half-steps are 2, 4, 6 and 20. 2 and 4 for optical nudges between a label and its
control. 6 for the tight gap inside a chip or a drag handle's height. 20 because
`Spacing16 + Spacing4` reads as two gaps and 20dp reads as one — a value that is not a
multiple of 8 can still be on the rhythm when it is a sum of two steps.

The legal set is exactly: **0, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64.**
Anything else is a finding.

### `spacing.no-raw-dp` — severity: error

A raw `<number>.dp` in main source is a finding wherever a spacing token exists.

krafttools carries 207 dp literals. kraft-ui carries zero outside its token definitions,
and that difference is entirely this rule. Spacing is the strongest signal that two apps
came from the same hand, and it is the one most cheaply lost to a typed number: nobody
types 13dp on purpose, they type 12dp, dislike the result, and nudge it.

Exempt: `**/Canvas.kt` and `**/ui/theme/**`. Waive with `@kraft-lint-ignore
spacing.no-raw-dp` plus a reason.

The legitimate minority is real and the rule knows it: a 1dp hairline
(`KraftSpacing.BorderWidth`), an icon's 20dp box (`KraftIconSize.Medium`) — component
metrics, not spacing. Those are the lines that should carry a waiver, because a waiver
with a reason is what makes the rest of the rule trustworthy. An unexplained exception is
indistinguishable from a bug.

### `spacing.rhythm` — severity: error

The literal must be on the legal set. **10, 13, 14, 18 and 26 are not on it** — and they
are exactly what englishkraft and pulsekraft are full of.

Note the two rules are not redundant. `spacing.no-raw-dp` catches the act of writing a
literal; `spacing.rhythm` catches the value even when the literal is legitimate — a 1dp
hairline is a real dp literal but 1 is on the scale, while a 13dp gap is off it whatever
you call it.

---

## 2. Typography

`KraftTypeScale` maps to SF Pro. Roboto is the system font on Android; the sizes are the
same numbers, so the hierarchy survives the substitution. Scale and weights matter more
than typeface.

| Token | Size | Apple HIG role |
|---|---|---|
| `LargeTitle` | 34sp | Large Title |
| `Title1` | 28sp | Title 1 |
| `Title2` | 22sp | Title 2 |
| `Title3` | 20sp | Title 3 |
| `Headline` | 17sp | Headline |
| `Body` | 17sp | Body |
| `Callout` | 16sp | Callout |
| `Subheadline` | 15sp | Subhead |
| `Footnote` | 13sp | Footnote |
| `Caption1` | 12sp | Caption |
| `Caption2` | 11sp | Caption 2 |
| `Badge` | 10sp | *Kraft addition* — count badges |
| `WidgetBody` | 14sp | *Kraft addition* — Glance widget text |
| `LabelSpacing` | 0.4sp | letter spacing for section headings |

`Body` and `Headline` are both 17sp. That is Apple's choice and it is deliberate: the
distinction between the two is weight and context, not size. Two different sizes for the
same role is how a scale stops being a scale.

`Badge` and `WidgetBody` are the only two values with no HIG counterpart, because badge
counts and widget text are not things the HIG sizes. They are additions to a scale, not
substitutions in it.

### Line heights, from `KraftTypography`

`displayLarge` 34/41, `headlineLarge` 28/34, `headlineMedium` 22/28, `headlineSmall`
20/25, `titleLarge` 17/22, `titleMedium` 16/21, `titleSmall` 15/20, `bodyLarge` 17/22,
`bodyMedium` 16/21, `bodySmall` 15/20. Labels: `labelLarge` 15sp/0.2 tracking,
`labelMedium` 13sp/0.2, `labelSmall` 11sp/0.2.

Weights: Bold for display and headlineLarge; SemiBold for headlineMedium/Small and all
titles; Normal for all bodies; Medium for all labels.

### `type.no-raw-sp` — severity: error

A raw `<number>.sp` in main source is a finding. Exempt: `**/ui/theme/**`.

barokraft carries 83 per-call `label.copy(fontSize = N.sp)` overrides. Each one was
probably correct at the moment it was written, and that is exactly the problem — a scale
that can be overridden at the call site is not a scale. When the scale changes, none of
the 83 follow.

### `type.scale-declared` — severity: error

The theme composable must pass a `Typography` built from `KraftTypeScale`. A bare
`Typography()` is a finding.

englishkraft and pulsekraft pass stock `Typography()`. They do not look like Kraft apps
because they are not using a Kraft type scale at all — and nothing in their build says
so. This rule exists to make the absence loud.

---

## 3. Touch targets — 44dp, and it is a floor

**44dp minimum. This is Apple's figure from the HIG, not Material's 48dp.**

```kotlin
// KraftTokens.kt
val TouchTarget = 44.dp
val SearchBarHeight = TouchTarget   // 44dp — visual consistency with the target
val TopBarHeight = TouchTarget      // 44dp
```

`SearchBarHeight` and `TopBarHeight` are both aliases of `TouchTarget` rather than fresh
44dp literals. That is the rule working: three measurements, one source, and a change to
the minimum moves all three.

### `a11y.touch-target` — severity: error

A clickable element's resolved size must be at least 44dp. **Where a platform component
supplies more, the more is kept.**

That second clause matters as much as the number. A Material `ListItem` with a trailing
icon, a `Switch`, a `Fab` — these already exceed 44dp, and shrinking one to hit the
number exactly would be a regression dressed as compliance. 44dp is the floor, never the
ceiling. Reach for the platform's generous target when it has one.

44 is smaller than Material's 48, and that is a decision rather than an oversight. This
portfolio follows Apple's HIG because the type scale, the grouped-background light theme
(`#F2F2F7`) and the tab-bar model are all Apple's. Mixing Apple's type with Material's
touch target would produce something that is neither.

---

## 4. Corner radius

From `KraftRadius`:

| Token | Value | Used for |
|---|---|---|
| `Small` | 8dp | chips, small inputs |
| `Standard` | 12dp | cards, list rows |
| `Large` | 14dp | raised cards, panes |
| `Medium` | 16dp | sheets, large surfaces |
| `Hero` | 20dp | hero images, featured tiles |
| `Modal` | 28dp | dialogs, modals |
| `Pill` | 50dp | fully rounded capsules |
| `DragHandle` | 2.5.dp | overlay drag handles |

### `radius.from-token` — severity: warn

`RoundedCornerShape(<number>.dp)` inline is a finding unless the value is on the scale or
carries a waiver.

**Warn, not error.** 10, 18, 11, 13 and 26 appear inline across barokraft, pulsekraft and
gitakraft, and some of those are deliberate optical exceptions — a radius chosen by eye
against a specific background is a legitimate thing to do. The warn severity exists so the
finding list is where those get *marked* deliberate or fixed. Promoting it to error before
that triage would be a gate that fails on work nobody has looked at yet.

`DragHandle` at 2.5dp is worth a note: it is not on the 8px rhythm and does not need to
be. A drag handle is a component metric, not spacing.

---

## 5. Motion

Springs, not durations, because a spring carries its own interruption behaviour: a
duration-based tween started mid-flight restarts or snaps, and a spring continues from
its current velocity.

`KraftSprings` in `kraft-ui/src/main/java/com/kraft/ui/motion/ReduceMotion.kt`:

| Preset | Normal | Purpose |
|---|---|---|
| `press` | `dampingRatio = 0.6f, stiffness = 500f` | tab press, filter pulse — bouncy but quick |
| `pop` | `dampingRatio = 0.7f, stiffness = 500f` | checkmark, selection pop — slightly underdamped |
| `entrance` | `dampingRatio = 0.7f, stiffness = 300f` | empty-state icon entrance — gentle bounce |
| `fadeEntrance` | `dampingRatio = 0.8f, stiffness = 200f` | text fade — near critically damped |

Stiffness 200–500 is the range for UI that must feel answered immediately; 300 and below
is for things arriving rather than responding. The two low-stiffness presets are the two
where a slower settle reads as deliberate.

Effective durations, since these are springs and you will be asked: `press` settles in
roughly 150ms, `pop` roughly 200ms, `entrance` roughly 300ms, `fadeEntrance` roughly
400ms. Non-essential motion stays under half a second. Anything longer is decoration, and
decoration is the first thing to cut.

Easing, where a tween is genuinely required (a colour cross-fade, a size change), is
`FastOutSlowInEasing`. Do not reach for `LinearEasing` on anything the eye tracks.

### `a11y.reduce-motion` — severity: error

Any animation or transition must be reachable through `rememberReduceMotion`.

```kotlin
val reduceMotion = rememberReduceMotion()
Modifier.animateFloatAsState(target, animationSpec = KraftSprings.press(reduceMotion))
```

`rememberReduceMotion()` returns true when either the animator duration scale is 0
(Developer Options → "Remove animations") or
`AccessibilityManager.isReduceMotionEnabled()` is set on API 31+. Both signals are checked
because users set them in different places and neither is authoritative alone.

Under reduce-motion the springs collapse: `press` and `pop` become critically damped
(`dampingRatio = 1f`) at high stiffness — still a state change, no overshoot. `entrance`
and `fadeEntrance` become `snap()`. Opacity and blur are kept; spring and scale are
dropped. That split is the point: motion is a preference, not a default, and the fix is
removing the *movement*, not removing the *feedback*.

---

## 6. Colour — light and dark

### Dark (the primary scheme)

OLED-first, true black. `KraftColorSchemes.Dark`:

- `background` `#000000` — true black, so an OLED panel's unlit pixels are off
- `surface` `#1C1C1E`, `surfaceVariant` `#2C2C2E`
- `surfaceContainer` `#242428`, `surfaceHigh` `#2E2E33` — the stepped depth scale
- `onSurface` `#FFFFFF`, `onSurfaceVariant` `#99EBEBF5` (cool grey-white at 60%, not pure white)
- `primary` `AuroraBlue #0A84FF`, `secondary` `AuroraTeal #40CBE0`, `tertiary` `AuroraOrange #FF9F0A`, `error` `#FF453A`
- `outline` `Separator #59545458`, `outlineVariant` `OpaqueSeparator #38383A`

The container scale is stepped on purpose. `SurfaceContainer` and `SurfaceHigh` must stay
visibly distinct — collapsing them, as M3 defaults do, erases the primary input on every
screen that has one.

### Light

iOS systemGrouped, in `KraftColorSchemes.Light`:

- `background` `#F2F2F7`, `surface` `#FFFFFF`
- `surfaceVariant` `#E5E5EA`, `onSurfaceVariant` `#3A3A3C`
- `primary` `#007AFF`, `secondary` `#5AC8FA`, `tertiary` `#FF9500`, `error` `#FF3B30`
- `outline` `#C6C6C8` at 30%

`KraftTheme(darkTheme = isSystemInDarkTheme())` follows the system by default. TrainKraft
passes `darkTheme = true` because it is dark-only, and that is the correct use of the
parameter.

One honest note on contrast, because the code comments it: `onPrimary = Color.White` on
`#0A84FF` measures **3.65:1**. That clears WCAG AA for large text and fails AA for body
text. It is Apple's convention and it is why the accent is used for large labels, filled
buttons and identity marks — never for a paragraph. If you need accent-coloured body text,
step the hue darker and say why in the palette.

### The two-scope rule

**Colour is PER-APP by design.** This is the one place where the portfolio deliberately
diverges, and the rule set says so explicitly rather than leaving it to be rediscovered as
an inconsistency every few months.

pulsekraft's `PulsePalette.kt` carries the reasoning, and it is the worked example:

> KraftTools is instrument-cyan. kraft-ui carries amber. Neither could
> be reused without the two apps reading as the same product, and
> identity is the whole reason a portfolio of separate apps is worth
> having.

Read that as a design argument rather than a preference. **A speed test and a barometer
that look alike are confusing.** If pulsekraft and krafttools shared an accent, a user who
has both installed would be guessing which app is in the foreground, and the visual
distinction that tells them is gone. Two apps that look the same are not one good product
seen twice — they are one app and a confusing copy.

This is also how Apple works. One design language, per-app accent. iOS system apps and
first-party apps share everything structural and each carries its own colour identity.

**What is shared:** spacing, type, radius, motion, touch targets, components, layering,
error handling. Enforced, no exceptions. These are what make nine apps read as one body
of work by the same hand.

**What is the app's own:** the accent, and everything derived from it.

### `colour.per-app-declared` — severity: error

A `Color(0x…)` outside the theme package must resolve to a name declared in the app's
palette file. The shared library's palette is a permitted source.

gitakraft's `SettingsScreen` pastes seven Aurora hexes the library already exports.
trainkraft hand-copies three status colours out of the library instead of importing them.
Both defeat the composite build: a change to the shared palette does not reach them, and
nobody finds out until the two have drifted far enough to be visible. Copying is not the
sin. Not being able to trace the copy is.

Exempt: `**/ui/theme/**` and `**/ui/ColorPicker.kt`.

### `colour.accent-per-app-allowed` — severity: info

**The inverse finding, and it exists on purpose.** Every app must declare its accent in a
single palette object with a comment naming the reason. An accent that differs from the
portfolio default is reported as *information*, never as a fault.

pulsekraft is violet (`#9D8CFF`). krafttools is instrument-cyan. gitakraft is saffron
(`#FF9F0A`). Those are decisions, and this rule puts them on the record so the divergence
is *declared* rather than *discovered* — by someone six months later wondering whether it
was an accident.

Severity `info` is load-bearing. Had this been an error against the portfolio default, the
rule would have pushed every app toward the same colour and quietly undone the design
argument above.

### `tokens.no-duplicate-palette` — severity: warn

Report hex values that also appear in another app in the portfolio. Informational; the
remedy is a shared palette, or an intentional divergence with a stated reason.

englishkraft and langkraft carry byte-identical 21-value palettes. Same principle as the
accent rules: copying is not the sin, the sin is that a fix to one never reaches the other
and no test can see it.

---

## 7. Accessibility

### Targets

44dp minimum, per `a11y.touch-target`, floor and not ceiling. Icon sizes from
`KraftIconSize`: `Tiny` 12dp, `Small` 16dp, `Medium` 20dp, `Compact` 22dp, `Large` 24dp,
`XLarge` 40dp, `TabBar` 25dp. The icon *box* is 20–24dp; the *target* around it is
`TouchTarget`. A 20dp glyph inside a 44dp target is correct. A 20dp glyph inside a 20dp
target is a finding.

### Labels — `a11y.content-description` — severity: error

Icon-only clickables require `contentDescription` or a `semantics` block. **A control a
screen reader cannot name is a control nobody can use.**

The label is the control's *name*, so it says what it does — "Filter", "Open settings" —
not what it looks like. TalkBack reads the icon's shape out loud to a sighted user
otherwise, which is the second-worst outcome available.

When a control is icon-plus-text, the text is already the name. Do not add a description
that repeats it; TalkBack will read both.

### Contrast

- Body text: **4.5:1** minimum (WCAG AA).
- Large text, 18sp+ or 14sp+ bold: **3:1**.
- Non-text UI — icons, trace lines, focus indicators: **3:1**.

pulsekraft's palette comment records the process, and it is the model: WCAG contrast
against the background for every value, then OKLab separation between neighbours so that
two colours which must be told apart at a glance clear ΔE 0.10. Its tightest text-adjacent
value is `PrimaryDim` at 3.73:1; its widest trace separation is 0.348. The comment also
records the one colour deliberately left out — there is no "good" green, because
amber-for-problem beside green-for-fine is the classic deuteranopia confusion, and a state
that exists only as a colour is a state that both a screen-reader user and a colourblind
user lose entirely.

### Motion

Every animation behind `rememberReduceMotion`, per `a11y.reduce-motion`. Covered in §5.

### Never

- Never encode a state in colour alone. Colour plus icon, or colour plus text.
- Never ship a README accessibility claim the rules do not pass
  (`docs.accessibility-noted`). A claim that is not implemented is worse than no claim.
- Never ship a build where `MaterialTheme` is missing. See ARCHITECTURE.md — a missing
  wrapper makes every colour and type reference resolve to Material defaults silently,
  which is `type.m3-wrapper-present`, and it has already happened in one app.
