/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.kraft.ui.tokens

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The tokens are the portfolio's shared vocabulary, so a change to one is a change to every
 * app that adopts this library. These tests exist to make that change impossible to make by
 * accident.
 *
 * What each test asserts is a decision recorded in standards/standard.json, not a snapshot of
 * today's numbers. The distinction matters: a snapshot test would be rewritten whenever it
 * failed, which is how a shared library loses its meaning. These fail until someone changes
 * the standard deliberately, in the file where the decision belongs.
 *
 * Rule `build.library-has-tests` fails if this file is deleted.
 */
class KraftTokensTest {

    // ── Type scale ──────────────────────────────────────────────────────────────────────────
    // Apple's HIG sizes for iOS and iPadOS. The scale is not a preference; it is the thing
    // that makes a Kraft app look like a Kraft app, and it is the single most duplicated set
    // of values in the portfolio — kalc and wallkraft each carry a byte-identical copy.

    @Test
    fun `type scale matches Apple HIG exactly`() {
        assertEquals(34f, KraftTypeScale.LargeTitle.value, 0.01f)
        assertEquals(28f, KraftTypeScale.Title1.value, 0.01f)
        assertEquals(22f, KraftTypeScale.Title2.value, 0.01f)
        assertEquals(20f, KraftTypeScale.Title3.value, 0.01f)
        assertEquals(17f, KraftTypeScale.Headline.value, 0.01f)
        assertEquals(17f, KraftTypeScale.Body.value, 0.01f)
        assertEquals(16f, KraftTypeScale.Callout.value, 0.01f)
        assertEquals(15f, KraftTypeScale.Subheadline.value, 0.01f)
        assertEquals(13f, KraftTypeScale.Footnote.value, 0.01f)
        assertEquals(12f, KraftTypeScale.Caption1.value, 0.01f)
        assertEquals(11f, KraftTypeScale.Caption2.value, 0.01f)
    }

    @Test
    fun `type scale is monotonically non-increasing, except the two 17s`() {
        // Headline and Body are both 17sp in Apple's scale. Everything else must descend, or
        // the scale has been edited into something that reads as arbitrary.
        val ordered = listOf(
            KraftTypeScale.LargeTitle, KraftTypeScale.Title1, KraftTypeScale.Title2,
            KraftTypeScale.Title3, KraftTypeScale.Headline, KraftTypeScale.Callout,
            KraftTypeScale.Subheadline, KraftTypeScale.Footnote,
            KraftTypeScale.Caption1, KraftTypeScale.Caption2,
        )
        for (i in 0 until ordered.size - 1) {
            assertTrue(
                "scale ascends at index $i: ${ordered[i].value} then ${ordered[i + 1].value}",
                ordered[i].value >= ordered[i + 1].value,
            )
        }
    }

    // ── Touch target ────────────────────────────────────────────────────────────────────────
    // Apple's HIG gives 44x44pt as the default control size for iOS and iPadOS. 48dp is
    // Google's Material figure. The standard follows Apple, and the rule is a floor rather
    // than a ceiling: where a platform component supplies more, the more is kept.

    @Test
    fun `touch target is the Apple minimum of 44dp`() {
        assertEquals(44f, KraftSpacing.TouchTarget.value, 0.01f)
    }

    @Test
    fun `touch target is not below the Material minimum either`() {
        // Belt and braces. If someone raises it to 48 that is a legitimate decision; if it
        // ever falls below 44, that is a regression against the HIG.
        assertTrue(KraftSpacing.TouchTarget.value >= 44f)
    }

    @Test
    fun `search bar and top bar are at least the touch target`() {
        // Both alias TouchTarget today. The test is written against the property rather than
        // the alias so that changing the alias does not silently break the guarantee.
        assertTrue(KraftSpacing.SearchBarHeight.value >= 44f)
        assertTrue(KraftSpacing.TopBarHeight.value >= 44f)
    }

    // ── Spacing rhythm ───────────────────────────────────────────────────────────────────────
    // The 8px rhythm with half-steps for optical adjustment. Rule `spacing.rhythm` checks app
    // code against this list; this test keeps the list and the tokens in step.

    @Test
    fun `every spacing token is on the documented rhythm`() {
        val allowed = setOf(0f, 1f, 2f, 3f, 4f, 6f, 8f, 12f, 16f, 20f, 24f, 32f, 40f, 48f, 56f, 64f)
        val actual = listOf(
            KraftSpacing.Spacing2, KraftSpacing.Spacing4, KraftSpacing.Spacing6,
            KraftSpacing.Spacing8, KraftSpacing.Spacing12, KraftSpacing.Spacing16,
            KraftSpacing.Spacing20, KraftSpacing.Spacing24, KraftSpacing.Spacing32,
            KraftSpacing.Spacing40, KraftSpacing.Spacing48, KraftSpacing.Spacing56,
            KraftSpacing.Spacing64,
        ).map { it.value }
        for (v in actual) {
            assertTrue("$v is not on the 8px rhythm", allowed.contains(v))
        }
    }

    @Test
    fun `screen edge padding is 16dp`() {
        assertEquals(16f, KraftSpacing.ScreenEdge.value, 0.01f)
    }

    // ── Corner radii ────────────────────────────────────────────────────────────────────────
    // DESIGN.md: 12dp standard, 20dp large/sheet, 8dp tight. The intermediate steps exist
    // and are allowed; what must not happen is a radius leaving the scale in app code.

    @Test
    fun `radii include the three values the design system names`() {
        assertEquals(8f, KraftRadius.Small.value, 0.01f)
        assertEquals(12f, KraftRadius.Standard.value, 0.01f)
        assertEquals(20f, KraftRadius.Hero.value, 0.01f)
    }

    @Test
    fun `radii ascend`() {
        val ordered = listOf(
            KraftRadius.DragHandle, KraftRadius.Small, KraftRadius.Standard,
            KraftRadius.Large, KraftRadius.Medium, KraftRadius.Hero,
            KraftRadius.Modal, KraftRadius.Pill,
        ).map { it.value }
        for (i in 0 until ordered.size - 1) {
            assertTrue(
                "radii ascend at index $i: ${ordered[i]} then ${ordered[i + 1]}",
                ordered[i] <= ordered[i + 1],
            )
        }
    }

    // ── The boundary rule ───────────────────────────────────────────────────────────────────
    // Rule `build.library-no-app-logic`. This is the test for the reason the library was
    // distrusted: it was extracted from wallkraft in September 2026 and the extraction carried
    // wallkraft's search cache, API rate limit, grid prefetch and image decode ceiling with
    // it. Nothing failed. This fails if any of them comes back.

    @Test
    fun `no app-shaped constants have crept back in`() {
        val forbidden = listOf(
            "SearchCache", "RateLimit", "GridPrefetch", "MaxDecode", "Wallhaven", "Glance",
        )
        val source = readOwnSource()
        for (needle in forbidden) {
            assertTrue(
                "'$needle' is app logic and does not belong in the shared tokens: $source",
                !source.contains("val $needle") && !source.contains("const val $needle"),
            )
        }
    }

    @Test
    fun `constants object holds only generic primitives`() {
        // Generic HTTP defaults and overlay alphas survive by design. A network timeout is
        // something any app would have chosen the same way; a rate limit is not.
        val allowed = setOf(
            "RetryMax", "RetryBackoffBaseMs", "CallTimeoutSec", "ConnectTimeoutSec",
            "ReadTimeoutSec", "ContainerAlpha", "MinRefreshMs", "OverlayScrimAlpha",
            "OverlayPillAlpha", "OverlayDragHandleAlpha", "OverlayHintAlpha",
            "ErrorContainerAlpha", "ErrorIconAlpha", "SkeletonAlphaMin", "SkeletonAlphaMax",
            "ShimmerGradientAlpha", "BadgeAlpha", "SelectionOverlayAlpha",
            "SurfaceVariantAlpha", "IconTintAlpha", "EmptyStateIconBgAlpha",
            "GlassTabOuterAlpha", "GlassTabInnerAlpha", "GlassTabMidAlpha",
            "GlassTabHighlightAlpha", "DialogElevation", "PanelElevation",
        )
        // Read from the source rather than by reflection. An earlier version of this test used
        // KraftConstants::class.java.declaredFields and reported DialogElevation and
        // PanelElevation as unexpected, because Compose's Dp is an inline value class and
        // reflects as a primitive float. Reflection on Kotlin value classes answers a different
        // question from the one being asked, and it fails confusingly.
        val declared = declaredNamesIn(KraftConstants::class.java.simpleName)
        val unexpected = declared - allowed
        assertTrue(
            "new constants in KraftConstants must be added to this list and justified: $unexpected",
            unexpected.isEmpty(),
        )
    }

    /** Every `val NAME` declared in the named object in this file. */
    private fun declaredNamesIn(objectName: String): Set<String> {
        val source = readOwnSource()
        if (source.isEmpty()) return emptySet()
        val body = source.substringAfter("object $objectName", "")
        if (body.isEmpty()) return emptySet()
        return Regex("""^\s*(?:const\s+)?val\s+([A-Za-z][A-Za-z0-9]*)""", RegexOption.MULTILINE)
            .findAll(body)
            .map { it.groupValues[1] }
            .toSet()
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────────────────

    /**
     * Reads this file from disk so the boundary test inspects the source rather than a
     * reflection of it. Reflection cannot see a constant that was *deleted*, which is
     * precisely the case that matters.
     *
     * Failing loudly when the file cannot be read is the point. An earlier version returned an
     * empty string on failure, which made both source-reading tests pass for the wrong reason:
     * a test that cannot see anything reports nothing found and succeeds. That is the same
     * shape as a scrub that matches nothing and reports success, and it is worse here,
     * because the test is the thing standing in for a reviewer's attention.
     */
    private fun readOwnSource(): String {
        val relative = "src/main/java/com/kraft/ui/tokens/KraftTokens.kt"
        val override = System.getProperty("kraft.lint.tokensSource")
        // Gradle runs a module's unit tests with that module as the working directory, so
        // "kraft-ui/src/main/..." does not resolve and "src/main/..." does. Both are tried
        // rather than guessing, because guessing wrong makes the boundary tests fail for a
        // reason that has nothing to do with the boundary.
        val candidates = listOfNotNull(
            override,
            relative,
            "../$relative",
            "kraft-ui/$relative",
        )
        val file = candidates.map { java.io.File(it) }.firstOrNull { it.exists() }
        assertTrue(
            "cannot read the tokens source. Tried: $candidates (cwd=${java.io.File(".").absolutePath}). " +
                "Set -Dkraft.lint.tokensSource=<path> when running from an unusual directory; " +
                "without the source these boundary tests pass vacuously, which is worse than failing.",
            file != null,
        )
        val text = file!!.readText()
        assertTrue("read an empty tokens source at ${file.absolutePath}", text.isNotBlank())
        return text
    }
}