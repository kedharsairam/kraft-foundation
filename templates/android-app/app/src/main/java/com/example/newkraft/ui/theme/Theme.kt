/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.example.newkraft.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.kraft.ui.tokens.KraftTypeScale

/**
 * The app's theme.
 *
 * Three decisions live here, and they are the three most often got wrong across the portfolio.
 *
 * **The MaterialTheme wrapper is not optional.**
 * barokraft's `setContent` is `Box(Modifier.fillMaxSize().background(Ink))` with no wrapper,
 * which meant every `MaterialTheme.colorScheme.*` and `MaterialTheme.typography.*` reference
 * below it silently resolved to Material's own defaults. The app was inconsistent with itself
 * and nothing reported it. Rule `type.m3-wrapper-present` exists because that shipped.
 *
 * **Do not pass a bare `Typography()`.**
 * englishkraft and pulsekraft both do, which is why they do not look like Kraft apps: they are
 * using Material's type scale, not the Kraft one. Build it from `KraftTypeScale` instead, as
 * below. Rule `type.scale-declared` fails on the bare constructor.
 *
 * **The accent is yours.**
 * Everything else — spacing, type, radius, motion, touch targets — is shared and comes from the
 * foundation. The accent is the one thing this portfolio deliberately does not standardise,
 * because pulsekraft's palette puts it plainly:
 *
 *     "KraftTools is instrument-cyan. kraft-ui carries amber. Neither could be reused without
 *      the two apps reading as the same product."
 *
 * That is right. A speed test and a barometer that look alike are confusing. So set your accent
 * once, in `NewKraftColors`, with a reason — and never repeat a colour literal anywhere else in
 * the app, because rule `colour.per-app-declared` fails on any `Color(0x…)` outside this file.
 *
 * This file is excluded from `type.no-raw-sp` and `spacing.no-raw-dp`, because a token file is
 * where the raw values legitimately live. That is the only exemption in the standard, and it is
 * why it is stated rather than implied.
 */
@Composable
fun NewKraftTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = NewKraftColors.scheme(darkTheme),
        typography = NewKraftTypography,
        content = content,
    )
}

/**
 * The Kraft type scale, mapped onto Material's slot names.
 *
 * Compose has no first-class "SF Pro" slot, so the mapping is explicit. The sizes come from
 * `KraftTypeScale` and never from a literal here, which is what makes the change to Apple's
 * scale a change in one place — and what the foundation's own test asserts.
 */
private val NewKraftTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = KraftTypeScale.LargeTitle.value.sp,
        lineHeight = 41.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = KraftTypeScale.Title2.value.sp,
        lineHeight = 28.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = KraftTypeScale.Title3.value.sp,
        lineHeight = 25.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = KraftTypeScale.Body.value.sp,
        lineHeight = 26.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Normal,
        fontSize = KraftTypeScale.Subheadline.value.sp,
        lineHeight = 22.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = KraftTypeScale.Caption1.value.sp,
        letterSpacing = KraftTypeScale.LabelSpacing.value.sp,
    ),
)