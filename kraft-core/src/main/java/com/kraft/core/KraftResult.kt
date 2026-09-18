/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.kraft.core

/**
 * Typed result wrapper for repository / use-case returns.
 *
 * Success carries data; Failure carries a typed [AppError]. This is the
 * single success/failure type for Kraft apps — callers switch on it
 * instead of catching exceptions.
 *
 * Distinct from Kotlin's stdlib [Result]. Import explicitly:
 * `com.kraft.core.KraftResult`.
 */
sealed class KraftResult<out T> {

    data class Success<T>(val data: T) : KraftResult<T>()

    data class Failure(val error: AppError) : KraftResult<Nothing>()

    val isSuccess: Boolean get() = this is Success

    val isFailure: Boolean get() = this is Failure

    inline fun <R> map(transform: (T) -> R): KraftResult<R> = when (this) {
        is Success -> Success(transform(data))
        is Failure -> this
    }

    inline fun <R> fold(onSuccess: (T) -> R, onFailure: (AppError) -> R): R = when (this) {
        is Success -> onSuccess(data)
        is Failure -> onFailure(error)
    }

    fun getOrNull(): T? = (this as? Success)?.data

    fun errorOrNull(): AppError? = (this as? Failure)?.error
}

/** Convenience: wrap a value as [KraftResult.Success]. */
fun <T> T.asSuccess(): KraftResult<T> = KraftResult.Success(this)

/** Convenience: wrap an [AppError] as [KraftResult.Failure]. */
fun AppError.asFailure(): KraftResult<Nothing> = KraftResult.Failure(this)

inline fun <T> KraftResult<T>.onSuccess(action: (T) -> Unit): KraftResult<T> {
    if (this is KraftResult.Success) action(data)
    return this
}

inline fun <T> KraftResult<T>.onFailure(action: (AppError) -> Unit): KraftResult<T> {
    if (this is KraftResult.Failure) action(error)
    return this
}

/**
 * Maps a thrown [Throwable] to the closest [AppError].
 * Used at repository boundaries to convert exceptions into typed errors.
 */
fun Throwable.toAppError(): AppError {
    val msg = message?.lowercase().orEmpty()
    return when {
        this is java.io.IOException &&
            ("unable to resolve host" in msg || "network is unreachable" in msg) ->
            AppError.NetworkError.NoConnection
        this is java.net.SocketTimeoutException || "timed out" in msg || "timeout" in msg ->
            AppError.NetworkError.Timeout
        this is java.io.IOException -> AppError.NetworkError.NoConnection
        else -> AppError.Unknown(this, message)
    }
}
