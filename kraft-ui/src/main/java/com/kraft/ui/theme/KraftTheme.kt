/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.kraft.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.kraft.ui.tokens.KraftColors
import com.kraft.ui.tokens.KraftConstants
import com.kraft.ui.tokens.KraftTypeScale

/**
 * Kraft color schemes — OLED-first dark, iOS-inspired light.
 *
 * Dark: true black (#000000) backgrounds, system grays for surfaces.
 * Light: systemGrouped (#F2F2F7) background, white surfaces.
 */
object KraftColorSchemes {
    val Light = lightColorScheme(
        primary = Color(0xFF007AFF),
        onPrimary = Color.White,
        primaryContainer = Color(0xFF007AFF).copy(alpha = KraftConstants.ContainerAlpha),
        onPrimaryContainer = Color(0xFF007AFF),
        secondary = Color(0xFF5AC8FA),
        onSecondary = Color.White,
        secondaryContainer = Color(0xFF5AC8FA).copy(alpha = KraftConstants.ContainerAlpha),
        onSecondaryContainer = Color(0xFF5AC8FA),
        tertiary = Color(0xFFFF9500),
        onTertiary = Color.White,
        error = Color(0xFFFF3B30),
        onError = Color.White,
        errorContainer = Color(0xFFFF3B30).copy(alpha = KraftConstants.ContainerAlpha),
        onErrorContainer = Color(0xFFFF3B30),
        background = Color(0xFFF2F2F7),
        onBackground = Color(0xFF000000),
        surface = Color(0xFFFFFFFF),
        onSurface = Color(0xFF000000),
        surfaceVariant = Color(0xFFE5E5EA),
        onSurfaceVariant = Color(0xFF3A3A3C),
        surfaceContainerLowest = Color(0xFFFFFFFF),
        surfaceContainerLow = Color(0xFFF2F2F7),
        surfaceContainer = Color(0xFFF2F2F7),
        surfaceContainerHigh = Color(0xFFFFFFFF),
        surfaceContainerHighest = Color(0xFFE5E5EA),
        surfaceDim = Color(0xFFE5E5EA),
        surfaceBright = Color(0xFFFFFFFF),
        inverseSurface = Color(0xFF000000),
        inverseOnSurface = Color.White,
        inversePrimary = Color(0xFF007AFF),
        scrim = Color.Black,
        outline = Color(0xFFC6C6C8).copy(alpha = 0.3f),
        outlineVariant = Color(0xFFC6C6C8),
    )

    val Dark = darkColorScheme(
        primary = KraftColors.AccentBlue,
        onPrimary = Color.Black,
        primaryContainer = KraftColors.AccentBlue.copy(alpha = KraftConstants.ContainerAlpha),
        onPrimaryContainer = KraftColors.AccentBlue,
        secondary = KraftColors.AccentTeal,
        onSecondary = Color.Black,
        secondaryContainer = KraftColors.AccentTeal.copy(alpha = KraftConstants.ContainerAlpha),
        onSecondaryContainer = KraftColors.AccentTeal,
        tertiary = KraftColors.AccentOrange,
        onTertiary = Color.Black,
        error = KraftColors.AccentRed,
        onError = Color.Black,
        errorContainer = KraftColors.AccentRed.copy(alpha = KraftConstants.ContainerAlpha),
        onErrorContainer = KraftColors.AccentRed,
        background = KraftColors.Background,
        onBackground = KraftColors.TextPrimary,
        surface = KraftColors.Surface,
        onSurface = KraftColors.TextPrimary,
        surfaceVariant = KraftColors.SurfaceSecondary,
        onSurfaceVariant = KraftColors.TextSecondary,
        surfaceContainerLowest = KraftColors.Background,
        surfaceContainerLow = KraftColors.Surface,
        surfaceContainer = KraftColors.SurfaceContainer,
        surfaceContainerHigh = KraftColors.SurfaceHigh,
        surfaceContainerHighest = KraftColors.SurfaceSecondary,
        surfaceDim = KraftColors.Background,
        surfaceBright = KraftColors.Surface,
        inverseSurface = KraftColors.TextPrimary,
        inverseOnSurface = Color.Black,
        inversePrimary = KraftColors.AccentBlue,
        scrim = Color.Black,
        outline = KraftColors.Separator,
        outlineVariant = KraftColors.OpaqueSeparator,
    )
}

/**
 * Typography — SF Pro scale on the system font.
 * Sizes from [KraftTypeScale]; weights and hierarchy matter more than typeface.
 */
object KraftTypography {
    val Typography = Typography(
        displayLarge = TextStyle(
            fontWeight = FontWeight.Bold,
            fontSize = KraftTypeScale.LargeTitle,
            lineHeight = 41.sp,
        ),
        headlineLarge = TextStyle(
            fontWeight = FontWeight.Bold,
            fontSize = KraftTypeScale.Title1,
            lineHeight = 34.sp,
        ),
        headlineMedium = TextStyle(
            fontWeight = FontWeight.SemiBold,
            fontSize = KraftTypeScale.Title2,
            lineHeight = 28.sp,
        ),
        headlineSmall = TextStyle(
            fontWeight = FontWeight.SemiBold,
            fontSize = KraftTypeScale.Title3,
            lineHeight = 25.sp,
        ),
        titleLarge = TextStyle(
            fontWeight = FontWeight.SemiBold,
            fontSize = KraftTypeScale.Headline,
            lineHeight = 22.sp,
        ),
        titleMedium = TextStyle(
            fontWeight = FontWeight.SemiBold,
            fontSize = KraftTypeScale.Callout,
            lineHeight = 21.sp,
        ),
        titleSmall = TextStyle(
            fontWeight = FontWeight.SemiBold,
            fontSize = KraftTypeScale.Subheadline,
            lineHeight = 20.sp,
        ),
        bodyLarge = TextStyle(
            fontWeight = FontWeight.Normal,
            fontSize = KraftTypeScale.Body,
            lineHeight = 22.sp,
        ),
        bodyMedium = TextStyle(
            fontWeight = FontWeight.Normal,
            fontSize = KraftTypeScale.Callout,
            lineHeight = 21.sp,
        ),
        bodySmall = TextStyle(
            fontWeight = FontWeight.Normal,
            fontSize = KraftTypeScale.Subheadline,
            lineHeight = 20.sp,
        ),
        labelLarge = TextStyle(
            fontWeight = FontWeight.Medium,
            fontSize = KraftTypeScale.Subheadline,
            letterSpacing = 0.2.sp,
        ),
        labelMedium = TextStyle(
            fontWeight = FontWeight.Medium,
            fontSize = KraftTypeScale.Footnote,
            letterSpacing = 0.2.sp,
        ),
        labelSmall = TextStyle(
            fontWeight = FontWeight.Medium,
            fontSize = KraftTypeScale.Caption2,
            letterSpacing = 0.2.sp,
        ),
    )
}

/**
 * Theme wrapper — dark-first OLED, light follows system.
 *
 * @param darkTheme defaults to system. Pass `true` to force dark
 * (TrainKraft is dark-only and passes `darkTheme = true`).
 */
@Composable
fun KraftTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val scheme = if (darkTheme) KraftColorSchemes.Dark else KraftColorSchemes.Light
    MaterialTheme(
        colorScheme = scheme,
        typography = KraftTypography.Typography,
        content = content,
    )
}
