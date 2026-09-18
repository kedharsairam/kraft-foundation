/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.kraft.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.kraft.ui.motion.KraftSprings
import com.kraft.ui.motion.rememberReduceMotion
import com.kraft.ui.tokens.KraftColors
import com.kraft.ui.tokens.KraftConstants
import com.kraft.ui.tokens.KraftIconSize
import com.kraft.ui.tokens.KraftRadius
import com.kraft.ui.tokens.KraftSpacing

/**
 * A tab in [KraftTabBar]. Navigation-agnostic — the host app maps
 * index ↔ destination. Icons follow the filled-when-selected convention.
 */
data class KraftTab(
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
)

/**
 * Floating glass tab bar — 4-layer frost pill, spring press, haptics.
 *
 * Layer stack (outer → inner): background @ 0.22, white @ 0.22,
 * surface-tertiary @ 0.45, surface-secondary @ 0.15.
 */
@Composable
fun KraftTabBar(
    tabs: List<KraftTab>,
    selectedIndex: Int,
    onTabSelected: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val reduceMotion = rememberReduceMotion()
    val haptics = LocalHapticFeedback.current

    Row(
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = KraftSpacing.Spacing24, vertical = KraftSpacing.Spacing2)
            .clip(CircleShape)
            .background(KraftColors.Background.copy(alpha = KraftConstants.GlassTabOuterAlpha))
            .background(KraftColors.TextPrimary.copy(alpha = KraftConstants.GlassTabInnerAlpha))
            .background(KraftColors.SurfaceTertiary.copy(alpha = KraftConstants.GlassTabMidAlpha))
            .background(KraftColors.SurfaceSecondary.copy(alpha = KraftConstants.GlassTabHighlightAlpha))
            .padding(horizontal = KraftSpacing.Spacing8, vertical = KraftSpacing.Spacing8),
    ) {
        tabs.forEachIndexed { index, tab ->
            val selected = index == selectedIndex
            val interaction = remember { MutableInteractionSource() }
            val pressed by interaction.collectIsPressedAsState()
            val scale by animateFloatAsState(
                targetValue = if (pressed) 0.92f else 1f,
                animationSpec = KraftSprings.press(reduceMotion),
                label = "tabPress",
            )
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(KraftRadius.Pill))
                    .background(
                        if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.18f)
                        else androidx.compose.ui.graphics.Color.Transparent,
                    )
                    .clickable(
                        interactionSource = interaction,
                        indication = null,
                        onClick = {
                            haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                            onTabSelected(index)
                        },
                    )
                    .graphicsLayer {
                        scaleX = scale
                        scaleY = scale
                    }
                    .padding(vertical = KraftSpacing.Spacing6),
            ) {
                Icon(
                    imageVector = if (selected) tab.selectedIcon else tab.unselectedIcon,
                    contentDescription = tab.label,
                    tint = if (selected) MaterialTheme.colorScheme.primary
                    else KraftColors.TabBarInactive,
                    modifier = Modifier.size(KraftIconSize.TabBar),
                )
                Text(
                    text = tab.label,
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                    ),
                    color = if (selected) MaterialTheme.colorScheme.primary
                    else KraftColors.TabBarInactive,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
    }
}
