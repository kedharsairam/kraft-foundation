/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.kraft.ui.theme

import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The type scale's second half.
 *
 * `KraftTokensTest` asserts the *sizes*. This file asserts the *pairing* — which size goes in
 * which Material slot, and what line height and tracking go with it. The two are separate
 * decisions and were separately untested, which meant the table published in `docs/DESIGN.md`
 * §"Line heights, from KraftTypography" was prose describing a file nobody checked. A
 * published table that nothing enforces is the exact failure this repository exists to end, so
 * the table is now a test.
 *
 * Why the line heights are literals here and not tokens in `KraftTypeScale`: the scale is the
 * set of *sizes* an app may choose from, and it is the thing apps copy. Line height is not a
 * choice — it is a consequence of pairing a size with a slot — so it belongs to the mapping,
 * where changing it changes every app at once and cannot be half-adopted. `Badge` and
 * `WidgetBody` have no HIG line height for the same reason they have no HIG counterpart.
 *
 * These values are Apple's, from the iOS/iPadOS HIG type table. They are not tuned, and
 * `type.no-raw-sp` exempts the theme directory precisely so that this file can hold them. That
 * exemption is why these assertions have to exist: the linter cannot check them, so a test
 * does.
 */
class KraftTypographyTest {

    private val t = KraftTypography.Typography

    /** Asserts a size/line-height pair as published in DESIGN.md. */
    private fun pair(name: String, style: TextStyle, size: Float, line: Float) {
        assertEquals("$name fontSize", size, style.fontSize.value, 0.01f)
        assertEquals("$name lineHeight", line, style.lineHeight.value, 0.01f)
    }

    // ── Display and headline ───────────────────────────────────────────────────────────────

    @Test
    fun `displayLarge is 34 over 41`() = pair("displayLarge", t.displayLarge, 34f, 41f)

    @Test
    fun `headlineLarge is 28 over 34`() = pair("headlineLarge", t.headlineLarge, 28f, 34f)

    @Test
    fun `headlineMedium is 22 over 28`() = pair("headlineMedium", t.headlineMedium, 22f, 28f)

    @Test
    fun `headlineSmall is 20 over 25`() = pair("headlineSmall", t.headlineSmall, 20f, 25f)

    // ── Title ──────────────────────────────────────────────────────────────────────────────

    @Test
    fun `titleLarge is 17 over 22`() = pair("titleLarge", t.titleLarge, 17f, 22f)

    @Test
    fun `titleMedium is 16 over 21`() = pair("titleMedium", t.titleMedium, 16f, 21f)

    @Test
    fun `titleSmall is 15 over 20`() = pair("titleSmall", t.titleSmall, 15f, 20f)

    // ── Body ───────────────────────────────────────────────────────────────────────────────

    @Test
    fun `bodyLarge is 17 over 22`() = pair("bodyLarge", t.bodyLarge, 17f, 22f)

    @Test
    fun `bodyMedium is 16 over 21`() = pair("bodyMedium", t.bodyMedium, 16f, 21f)

    @Test
    fun `bodySmall is 15 over 20`() = pair("bodySmall", t.bodySmall, 15f, 20f)

    // ── Labels carry tracking instead of a line height ────────────────────────────────────
    //
    // Labels are single-line by convention, so a line height on them does nothing a reader can
    // see; what distinguishes a label is its tracking. These three therefore assert size and
    // tracking, and assert that no line height has crept in.

    @Test
    fun `labelLarge is 15 with 0_2 tracking and no line height`() {
        assertEquals(15f, t.labelLarge.fontSize.value, 0.01f)
        assertEquals(0.2f, t.labelLarge.letterSpacing.value, 0.01f)
        assertEquals(
            "a label line height is never read — if one appears, it is a sign the style was copied from a body slot",
            TextUnit.Unspecified, t.labelLarge.lineHeight,
        )
    }

    @Test
    fun `labelMedium is 13 with 0_2 tracking and no line height`() {
        assertEquals(13f, t.labelMedium.fontSize.value, 0.01f)
        assertEquals(0.2f, t.labelMedium.letterSpacing.value, 0.01f)
        assertEquals(TextUnit.Unspecified, t.labelMedium.lineHeight)
    }

    @Test
    fun `labelSmall is 11 with 0_2 tracking and no line height`() {
        assertEquals(11f, t.labelSmall.fontSize.value, 0.01f)
        assertEquals(0.2f, t.labelSmall.letterSpacing.value, 0.01f)
        assertEquals(TextUnit.Unspecified, t.labelSmall.lineHeight)
    }

    // ── Weights ───────────────────────────────────────────────────────────────────────────

    @Test
    fun `weights follow the published table`() {
        // Bold display, SemiBold headlines and titles, Normal bodies, Medium labels. The one
        // that matters most is body: SemiBold on body text is the single fastest way to make
        // an app stop looking like it was designed.
        //
        // headlineLarge is Bold, not SemiBold, and that is not a slip: it carries the HIG
        // Title 1 slot at 28pt, where SemiBold reads as a heading that lost its voice.
        // An earlier version of this test asserted SemiBold here and failed against a theme
        // that was correct all along.
        assertEquals(FontWeight.Bold, t.displayLarge.fontWeight)
        assertEquals(FontWeight.Bold, t.headlineLarge.fontWeight)
        assertEquals(FontWeight.SemiBold, t.headlineMedium.fontWeight)
        assertEquals(FontWeight.SemiBold, t.titleLarge.fontWeight)
        assertEquals(FontWeight.Normal, t.bodyLarge.fontWeight)
        assertEquals(FontWeight.Normal, t.bodyMedium.fontWeight)
        assertEquals(FontWeight.Normal, t.bodySmall.fontWeight)
        assertEquals(FontWeight.Medium, t.labelLarge.fontWeight)
        assertEquals(FontWeight.Medium, t.labelMedium.fontWeight)
        assertEquals(FontWeight.Medium, t.labelSmall.fontWeight)
    }

    // ── The pairing itself ─────────────────────────────────────────────────────────────────

    @Test
    fun `no two body slots share a size, and the size comes from the scale`() {
        // Guards against a copy-paste that gives bodyMedium and bodyLarge the same number.
        // They are currently 16 and 17, which is a real distinction from the HIG table and
        // therefore the first thing that would be "tidied" by someone assuming it was a
        // mistake.
        assertEquals(17f, t.bodyLarge.fontSize.value, 0.01f)
        assertEquals(16f, t.bodyMedium.fontSize.value, 0.01f)
        assertEquals(15f, t.bodySmall.fontSize.value, 0.01f)
    }

    @Test
    fun `every slot that has a font size also has a line height, except the labels`() {
        // A half-filled slot is the failure mode of a hand-maintained mapping: someone adds
        // fontSize and forgets lineHeight, and the text renders at the font's natural leading.
        val labelled = setOf("labelLarge", "labelMedium", "labelSmall")
        val all = mapOf(
            "displayLarge" to t.displayLarge,
            "headlineLarge" to t.headlineLarge,
            "headlineMedium" to t.headlineMedium,
            "headlineSmall" to t.headlineSmall,
            "titleLarge" to t.titleLarge,
            "titleMedium" to t.titleMedium,
            "titleSmall" to t.titleSmall,
            "bodyLarge" to t.bodyLarge,
            "bodyMedium" to t.bodyMedium,
            "bodySmall" to t.bodySmall,
            "labelLarge" to t.labelLarge,
            "labelMedium" to t.labelMedium,
            "labelSmall" to t.labelSmall,
        )
        for ((name, style) in all) {
            if (name in labelled) continue
            assertNotEquals("$name has no line height", TextUnit.Unspecified, style.lineHeight)
            assertTrue(
                "$name line height (${style.lineHeight.value}) must exceed its font size (${style.fontSize.value})",
                style.lineHeight.value > style.fontSize.value,
            )
        }
    }
}
