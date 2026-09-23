/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.kraft.ui.components

import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.kraft.ui.motion.rememberReduceMotion
import com.kraft.ui.tokens.KraftConstants
import com.kraft.ui.tokens.KraftIconSize
import com.kraft.ui.tokens.KraftRadius
import com.kraft.ui.tokens.KraftSpacing

/**
 * Shimmer loading list — left-to-right sweep over skeleton rows.
 *
 * Generic counterpart to the grid shimmer: each row is an icon circle +
 * two text lines, matching the shape of typical search result rows so
 * content doesn't jump when real data arrives.
 *
 * Stops animating when backgrounded or when reduce-motion is on
 * (battery + accessibility).
 *
 * @param rows number of skeleton rows to render.
 * @param contentDescription accessibility label for the loading region.
 */
@Composable
fun ShimmerList(
    modifier: Modifier = Modifier,
    rows: Int = 8,
    contentDescription: String = "Loading",
) {
    val reduceMotion = rememberReduceMotion()
    val lifecycleOwner = LocalLifecycleOwner.current
    val lifecycleState by lifecycleOwner.lifecycle.currentStateFlow.collectAsStateWithLifecycle()
    val isVisible = lifecycleState.isAtLeast(Lifecycle.State.STARTED) && !reduceMotion

    val transition = rememberInfiniteTransition(label = "shimmerList")
    val sweepOffset by if (isVisible) {
        transition.animateFloat(
            initialValue = -1f,
            targetValue = 2f,
            animationSpec = infiniteRepeatable(
                animation = tween(durationMillis = 1200, easing = EaseInOut),
                repeatMode = RepeatMode.Restart,
            ),
            label = "shimmerSweep",
        )
    } else {
        remember { mutableStateOf(0f) }
    }

    val base = MaterialTheme.colorScheme.surfaceVariant
    val shimmerBrush = Brush.linearGradient(
        colors = listOf(
            base,
            base.copy(alpha = KraftConstants.ShimmerGradientAlpha),
            base,
        ),
        start = Offset(sweepOffset * 400f, 0f),
        end = Offset(sweepOffset * 400f + 400f, 0f),
    )

    // Deliberately a Column, NOT a LazyColumn: skeleton row count is small and
    // fixed, and a lazy list here gets measured with infinite height whenever
    // this component is nested inside another scrollable (LazyColumn item,
    // verticalScroll column) — which crashes at measure time. A plain Column
    // wraps content and is safe in any parent.
    Column(
        verticalArrangement = Arrangement.spacedBy(KraftSpacing.Spacing8),
        modifier = modifier.semantics { this.contentDescription = contentDescription },
    ) {
        repeat(rows) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(KraftRadius.Standard))
                    .background(base.copy(alpha = KraftConstants.SkeletonAlphaMin))
                    .padding(
                        horizontal = KraftSpacing.Spacing16,
                        vertical = KraftSpacing.Spacing12,
                    ),
            ) {
                Box(
                    modifier = Modifier
                        .size(KraftIconSize.XLarge)
                        .clip(CircleShape)
                        .background(shimmerBrush),
                )
                Spacer(Modifier.width(KraftSpacing.Spacing12))
                Column(modifier = Modifier.weight(1f)) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.45f)
                            .height(KraftSpacing.Spacing16)
                            .clip(RoundedCornerShape(KraftSpacing.Spacing4))
                            .background(shimmerBrush),
                    )
                    Spacer(Modifier.height(KraftSpacing.Spacing8))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.75f)
                            .height(KraftSpacing.Spacing12)
                            .clip(RoundedCornerShape(KraftSpacing.Spacing4))
                            .background(shimmerBrush),
                    )
                }
            }
        }
    }
}
