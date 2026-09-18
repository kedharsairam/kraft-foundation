/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.kraft.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.SearchOff
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import com.kraft.ui.R
import com.kraft.ui.motion.KraftSprings
import com.kraft.ui.motion.rememberReduceMotion
import com.kraft.ui.tokens.KraftConstants
import com.kraft.ui.tokens.KraftIconSize
import com.kraft.ui.tokens.KraftSpacing

/**
 * Clean empty state — large icon, concise title, optional action.
 * Entrance: icon scales in with spring, text fades in.
 */
@Composable
fun EmptyState(
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    icon: ImageVector = Icons.Outlined.SearchOff,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    var entered by remember { mutableStateOf(false) }
    val reduceMotion = rememberReduceMotion()
    LaunchedEffect(Unit) { entered = true }
    val iconScale by animateFloatAsState(
        targetValue = if (entered) 1f else 0.6f,
        animationSpec = KraftSprings.entrance(reduceMotion),
        label = "emptyIconScale",
    )
    val contentAlpha by animateFloatAsState(
        targetValue = if (entered) 1f else 0f,
        animationSpec = KraftSprings.fadeEntrance(reduceMotion),
        label = "emptyContentAlpha",
    )

    Column(
        modifier = modifier.fillMaxSize(),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(KraftIconSize.XLarge * 2)
                .scale(iconScale)
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = KraftConstants.EmptyStateIconBgAlpha)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = KraftConstants.IconTintAlpha),
                modifier = Modifier.size(KraftIconSize.XLarge),
            )
        }
        Spacer(Modifier.height(KraftSpacing.Spacing16))
        Text(
            text = title,
            style = MaterialTheme.typography.headlineMedium,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .padding(horizontal = KraftSpacing.Spacing32)
                .graphicsLayer { alpha = contentAlpha },
        )
        Spacer(Modifier.height(KraftSpacing.Spacing8))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .padding(horizontal = KraftSpacing.Spacing32)
                .graphicsLayer { alpha = contentAlpha },
        )
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(KraftSpacing.Spacing16))
            TextButton(onClick = onAction) {
                Text(actionLabel)
            }
        }
    }
}

/** Error state — [EmptyState] with retry action. */
@Composable
fun ErrorState(
    message: String,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
) {
    EmptyState(
        title = stringResource(R.string.kraft_error_title),
        message = message,
        actionLabel = stringResource(R.string.kraft_error_retry),
        onAction = onRetry,
        modifier = modifier,
    )
}
