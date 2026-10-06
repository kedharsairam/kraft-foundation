/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.example.newkraft.ui.theme

import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.ui.graphics.Color
import com.kraft.ui.theme.KraftColorSchemes

/**
 * The app's palette. This is the one place a colour literal is allowed to live — see
 * `colour.per-app-declared`.
 *
 * ── Why this file exists at all, when the foundation has a palette ──────────────────────────
 *
 * Because the accent is deliberately per-app. The foundation's colours are structural —
 * surfaces, separators, text steps — and those are shared so that two Kraft apps are recognisably
 * related. The accent is what the app is *about*, and nine apps that all lead with the same
 * blue stop being nine products.
 *
 * pulsekraft states the reasoning better than this file can:
 *
 *     "KraftTools is instrument-cyan. kraft-ui carries amber. Neither could be reused without the
 *      two apps reading as the same product."
 *
 * So: take the surfaces from the foundation, choose the accent here, and write down why. The
 * comment under `Accent` is not decoration — it is what stops the next person "fixing" the
 * inconsistency.
 */
object NewKraftColors {

    /**
     * The accent.
     *
     * CHANGE: pick one, and say what it is for. Examples of reasoning that holds up:
     *
     *   - "Instrument cyan. This app is a measuring instrument; the cyan reads as a readout and
     *      is deliberately unlike the sibling instrument apps so the two are not confused on a
     *      phone screen."
     *   - "Saffron. The content is scriptural and the accent is liturgical, not technical."
     *
     * Reasoning that does not hold up: "it looked nice". That is the reason every app ends up
     * the same colour.
     */
    val Accent = Color(0xFF9D8CFF)
    val OnAccent = Color(0xFF1B1430)

    /**
     * The scheme. Structural colours come from the foundation so a change there reaches every
     * app; only the accent is local.
     */
    fun scheme(dark: Boolean) = if (dark) {
        darkColorScheme(
            primary = Accent,
            onPrimary = OnAccent,
            background = KraftColorSchemes.Dark.background,
            surface = KraftColorSchemes.Dark.surface,
            surfaceVariant = KraftColorSchemes.Dark.surfaceVariant,
            onSurface = KraftColorSchemes.Dark.onSurface,
            onSurfaceVariant = KraftColorSchemes.Dark.onSurfaceVariant,
            outline = KraftColorSchemes.Dark.outline,
            error = KraftColorSchemes.Dark.error,
        )
    } else {
        lightColorScheme(
            primary = Accent,
            onPrimary = OnAccent,
            background = KraftColorSchemes.Light.background,
            surface = KraftColorSchemes.Light.surface,
            surfaceVariant = KraftColorSchemes.Light.surfaceVariant,
            onSurface = KraftColorSchemes.Light.onSurface,
            onSurfaceVariant = KraftColorSchemes.Light.onSurfaceVariant,
            outline = KraftColorSchemes.Light.outline,
            error = KraftColorSchemes.Light.error,
        )
    }
}