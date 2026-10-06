/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.kraft.ui.tokens

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Kraft Foundation — Design Tokens.
 *
 * Single source of truth for color, spacing, radius, icon, type and tuning
 * constants across all Kraft apps. Extracted from WallKraft (Sep 2026).
 *
 * Rules:
 * - Screens reference these tokens, never raw dp/sp/hex (except the
 *   canonical definitions below).
 * - App-specific tokens (e.g. Wallhaven purity chips) live in clearly
 *   marked sections at the bottom. Prefer generic names for new tokens.
 */
object KraftColors {
    // ─── Brand Colors ──────────────────────────────────────────────────
    // Aurora palette — dark-first identity for Kraft apps.
    val AuroraBlue = Color(0xFF0A84FF)
    val AuroraGreen = Color(0xFF30D158)
    val AuroraRed = Color(0xFFFF453A)
    val AuroraOrange = Color(0xFFFF9F0A)
    val AuroraPink = Color(0xFFFF375F)
    val AuroraPurple = Color(0xFFBF5AF2)
    val AuroraIndigo = Color(0xFF5E5CE6)
    val AuroraTeal = Color(0xFF40CBE0)

    // ─── Legacy aliases ────────────────────────────────────────────────
    // Kept for backwards compatibility. New code should use Aurora* names.
    val AccentBlue = AuroraBlue
    val AccentGreen = AuroraGreen
    val AccentRed = AuroraRed
    val AccentOrange = AuroraOrange
    val AccentPink = AuroraPink
    val AccentPurple = AuroraPurple
    val AccentIndigo = AuroraIndigo
    val AccentTeal = AuroraTeal

    // ─── Backgrounds & Surfaces — Dark Mode ───────────────────────────
    // True black for OLED. System grays for surfaces.
    val Background = Color(0xFF000000)
    val Surface = Color(0xFF1C1C1E)
    val SurfaceSecondary = Color(0xFF2C2C2E)
    val SurfaceTertiary = Color(0xFF3A3A3C)

    /**
     * Search bar background. Generic: a search field that sits above the page needs to be
     * distinguishable from it, whatever the app is searching.
     */
    val SearchBar = Color(0xFF1C1C1E)

    /**
     * Stepped container scale for nested depth: cards sit on Low (= Surface),
     * fields/chips/buttons-inside-cards lift to High. High must stay visibly
     * above Low — collapsing them (as M3 defaults do) erases the primary
     * input on every screen.
     */
    val SurfaceContainer = Color(0xFF242428)
    val SurfaceHigh = Color(0xFF2E2E33)

    // ─── Text — Dark Mode ──────────────────────────────────────────────
    // Labels use #EBEBF5 base (cool gray-white, not pure white).
    val TextPrimary = Color(0xFFFFFFFF)
    val TextSecondary = Color(0x99EBEBF5)
    val TextTertiary = Color(0x80EBEBF5)

    // ─── Separators ─────────────────────────────────────────────────────
    val Separator = Color(0x59545458)
    val OpaqueSeparator = Color(0xFF38383A)

    // ─── Glass (frosted overlays) ───────────────────────────────────────
    val Glass = Color.Black.copy(alpha = 0.55f)
    val GlassBorder = Color.White.copy(alpha = 0.35f)

    // ─── Tab Bar ────────────────────────────────────────────────────────
    val TabBarInactive = Color(0xFF9E9EA3)
    val TabBarSeparator = Color(0xFF38383A)

    // ─── Filter Chips ──────────────────────────────────────────────────
    val ChipSelectedContainer = AuroraBlue.copy(alpha = 0.2f)
    val ChipSelectedLabel = AuroraBlue

    /**
     * Widget background — near-black, slightly lifted for depth.
     *
     * This one was borderline and is staying deliberately. A widget is an app feature, but a
     * Kraft widget that did not look like a Kraft app would be worse than no shared value at
     * all, so the background is a shared decision even though the widget is not. That is the
     * test this file applies: would an app delete this without consequence? For a search cache,
     * yes. For a widget background, no.
     */
    val WidgetBackground = Color(0xFF1A1A1A)
}

object KraftSpacing {
    /** 8px rhythm — standard spacing scale. */
    val Spacing2 = 2.dp
    val Spacing4 = 4.dp
    val Spacing6 = 6.dp
    val Spacing8 = 8.dp
    val Spacing12 = 12.dp
    val Spacing16 = 16.dp
    val Spacing20 = 20.dp
    val Spacing24 = 24.dp
    val Spacing32 = 32.dp
    val Spacing40 = 40.dp
    val Spacing48 = 48.dp
    val Spacing56 = 56.dp
    val Spacing64 = 64.dp

    /** Screen edge padding — 16dp on standard phones. */
    val ScreenEdge = Spacing16

    /** Minimum tile width for adaptive grid columns. */
    val GridTileMin = 150.dp

    /** Standard touch target — 44dp (accessibility minimum). */
    val TouchTarget = 44.dp

    /** Search bar height — matches TouchTarget for visual consistency. */
    val SearchBarHeight = TouchTarget

    /** Top bar height. */
    val TopBarHeight = TouchTarget

    /**
     * End clearance above the floating glass tab capsule: pill (~66dp) +
     * vertical margins (16dp) + gesture nav area (~38dp budget).
     */
    val GlassBarReserve = 120.dp

    /** Standard border width — 1dp hairline. */
    val BorderWidth = 1.dp

    /** Progress bar / loading indicator height. */
    val ProgressBarHeight = 2.dp

    /** Spinner stroke width. */
    val SpinnerStroke = 2.dp

    /** Avatar size — 32dp circular. */
    val AvatarSize = 32.dp

    /** Drag handle width — 36dp (height uses Spacing6). */
    val DragHandleWidth = 36.dp
}

object KraftRadius {
    val Small = 8.dp
    val Standard = 12.dp
    val Large = 14.dp
    val Medium = 16.dp
    val Hero = 20.dp
    val Modal = 28.dp
    val Pill = 50.dp
    val DragHandle = 2.5.dp
}

object KraftIconSize {
    val Tiny = 12.dp
    val Small = 16.dp
    val Medium = 20.dp
    val Compact = 22.dp
    val Large = 24.dp
    val XLarge = 40.dp
    val TabBar = 25.dp
}

object KraftTypeScale {
    /**
     * Type scale — maps to SF Pro sizes.
     * System font (Roboto) is close enough; scale and weights matter more.
     */
    val LargeTitle = 34.sp
    val Title1 = 28.sp
    val Title2 = 22.sp
    val Title3 = 20.sp
    val Headline = 17.sp
    val Body = 17.sp
    val Callout = 16.sp
    val Subheadline = 15.sp
    val Footnote = 13.sp
    val Caption1 = 12.sp
    val Caption2 = 11.sp
    val Badge = 10.sp
    val WidgetBody = 14.sp

    /** Letter spacing for section headings and labels. */
    val LabelSpacing = 0.4.sp
}

/**
 * Centralised tuning constants — every magic number lives here.
 *
 * Scope boundary, enforced by rule `build.library-no-app-logic`
 * -------------------------------------------------------
 * This object is the reason the foundation was distrusted. It was extracted from wallkraft in
 * September 2026 and the extraction carried wallkraft's concerns with it: a search cache, an
 * API rate limit, a browse grid's prefetch tuning, an image decode ceiling, a widget colour.
 * Those are wallkraft's decisions, and once they sit here every app that adopts this library
 * inherits them — and the next app that needs a token finds the precedent and adds another.
 *
 * What may live here is a *generic primitive* that any app would have chosen the same way:
 * overlay alphas, elevation, spring and shimmer values, and plain HTTP defaults.
 *
 * Removed on that basis, and they now live in wallkraft:
 *
 *     SearchCacheTtlMs, SearchCacheMaxEntries    wallkraft's search result cache
 *     RateLimitCooldownMs                         Wallhaven's documented rate limit
 *     GridPrefetchAhead/Threshold/DebounceMs     wallkraft's browse grid
 *     MaxDecodeDim                                wallkraft's wallpaper decode ceiling
 *
 * If you find yourself adding a constant here that one app could delete without consequence,
 * it does not belong here. WidgetBackground stayed, and the comment on it says why: a widget
 * is an app feature, but a Kraft widget that did not look like a Kraft app would be worse
 * than no shared value at all.
 */
object KraftConstants {
    // -- Network --
    // Generic HTTP defaults. App-specific limits — a provider's rate limit, a paging size —
    // belong to the app that knows them.
    const val RetryMax = 3
    const val RetryBackoffBaseMs = 1000L
    const val CallTimeoutSec = 30L
    const val ConnectTimeoutSec = 15L
    const val ReadTimeoutSec = 15L

    // -- UI --
    const val ContainerAlpha = 0.2f
    const val MinRefreshMs = 500L

    // -- Overlay alphas --
    const val OverlayScrimAlpha = 0.55f
    const val OverlayPillAlpha = 0.7f
    const val OverlayDragHandleAlpha = 0.38f
    const val OverlayHintAlpha = 0.55f

    // -- Error states --
    const val ErrorContainerAlpha = 0.4f
    const val ErrorIconAlpha = 0.7f

    // -- Skeleton / Shimmer --
    const val SkeletonAlphaMin = 0.3f
    const val SkeletonAlphaMax = 0.5f
    const val ShimmerGradientAlpha = 0.5f

    // -- Badges --
    const val BadgeAlpha = 0.85f
    const val SelectionOverlayAlpha = 0.4f

    // -- Card / Surface --
    const val SurfaceVariantAlpha = 0.4f
    const val IconTintAlpha = 0.85f
    const val EmptyStateIconBgAlpha = 0.40f

    // -- Glass tab --
    const val GlassTabOuterAlpha = 0.22f
    const val GlassTabInnerAlpha = 0.22f
    const val GlassTabMidAlpha = 0.45f
    const val GlassTabHighlightAlpha = 0.15f

    // -- Elevation / Depth --
    val DialogElevation = 12.dp
    val PanelElevation = 16.dp
}
