/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.kraft.ui.motion

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import androidx.compose.animation.core.AnimationSpec
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.spring
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

/**
 * Reduce Motion: when the user disables animations (Animator duration
 * scale 0 or Accessibility Reduce Motion), all non-essential motion
 * collapses to opacity/snap. Keep opacity and blur, drop spring/scale.
 */
@Composable
fun rememberReduceMotion(): Boolean {
    val context = LocalContext.current
    return remember(context) { isReduceMotionEnabled(context) }
}

fun isReduceMotionEnabled(context: Context): Boolean {
    // 1) Animator duration scale 0 = "Remove animations" in Developer Options
    try {
        val scale = Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
        if (scale == 0f) return true
    } catch (_: Exception) { }
    // 2) AccessibilityManager.isReduceMotionEnabled() — Android 12+ (API 31)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        try {
            val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
            if (am != null) {
                val method = am.javaClass.getMethod("isReduceMotionEnabled")
                if (method.invoke(am) as? Boolean == true) return true
            }
        } catch (_: Exception) { }
    }
    return false
}

/**
 * Spring presets — every press/pop/entrance animation in Kraft apps uses
 * one of these. Pass [reduceMotion] to collapse to [snap].
 */
object KraftSprings {
    /** Tab press, filter pulse — bouncy but quick. */
    fun press(reduceMotion: Boolean): AnimationSpec<Float> =
        if (reduceMotion) spring(dampingRatio = 1f, stiffness = 5000f)
        else spring(dampingRatio = 0.6f, stiffness = 500f)

    /** Checkmark, selection pop — slightly underdamped. */
    fun pop(reduceMotion: Boolean): AnimationSpec<Float> =
        if (reduceMotion) spring(dampingRatio = 1f, stiffness = 1000f)
        else spring(dampingRatio = 0.7f, stiffness = 500f)

    /** Empty-state icon entrance — gentle bounce. */
    fun entrance(reduceMotion: Boolean): AnimationSpec<Float> =
        if (reduceMotion) snap()
        else spring(dampingRatio = 0.7f, stiffness = 300f)

    /** Text fade entrance — near critically damped. */
    fun fadeEntrance(reduceMotion: Boolean): AnimationSpec<Float> =
        if (reduceMotion) snap()
        else spring(dampingRatio = 0.8f, stiffness = 200f)
}
