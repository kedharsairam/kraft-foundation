/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 Kedhar Sairam
 */
package com.kraft.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Tests for [KraftResult] and [AppError].
 *
 * Two things about this file matter more than its coverage.
 *
 * **It tests decisions, not today's implementation.** `toAppError` classifying a bare
 * `IOException` as `NoConnection` is a decision, not an accident — a bare `IOException` also
 * covers a read-only filesystem, and the argument that it is more often a connectivity
 * problem is why the mapping is what it is. A snapshot test would be rewritten the first time
 * that argument was revisited, which is exactly when it should not be.
 *
 * **The fall-through arms are tested as carefully as the specific ones.** Every `when` in
 * `toAppError` has a branch that is easy to write and never to hit, because the exception you
 * did not think of is the one that arrives. Each test below is named after the arm it defends.
 *
 * Rule `build.library-has-tests` fails if this file is deleted. It was deleted for most of this
 * library's life: kraft-ui had tests and kraft-core did not, which is the more consequential
 * of the two to leave untested, since `toAppError` is the boundary where an exception becomes
 * something the UI can render.
 */
class KraftResultTest {

    // ── Success and failure ────────────────────────────────────────────────────────────────

    @Test
    fun `success reports itself as success and not as failure`() {
        val r = KraftResult.Success(42)
        assertTrue(r.isSuccess)
        assertFalse(r.isFailure)
    }

    @Test
    fun `failure reports itself as failure and not as success`() {
        val r = KraftResult.Failure(AppError.DataError.NotFound)
        assertTrue(r.isFailure)
        assertFalse(r.isSuccess)
    }

    @Test
    fun `getOrNull yields the value on success`() {
        assertEquals(42, (KraftResult.Success(42) as KraftResult<Int>).getOrNull())
    }

    @Test
    fun `getOrNull yields null on failure rather than throwing`() {
        // The whole point of the type. A caller who wants the default must not have to catch.
        val r: KraftResult<Int> = KraftResult.Failure(AppError.StorageError.DiskFull)
        assertNull(r.getOrNull())
    }

    @Test
    fun `errorOrNull yields the error on failure`() {
        val e = AppError.AuthError.Unauthorized
        assertSame(e, (KraftResult.Failure(e) as KraftResult<Int>).errorOrNull())
    }

    @Test
    fun `errorOrNull yields null on success`() {
        assertNull((KraftResult.Success(1) as KraftResult<Int>).errorOrNull())
    }

    // ── map ─────────────────────────────────────────────────────────────────────────────────

    @Test
    fun `map transforms a success`() {
        val out: KraftResult<Int> = KraftResult.Success(21).map { it * 2 }
        assertEquals(42, out.getOrNull())
    }

    @Test
    fun `map passes a failure through untouched`() {
        // The transform must not run. If it did, an error path would be able to throw — and a
        // map that throws on the failure branch has turned a recoverable error into a crash.
        val e = AppError.DataError.NotFound
        val out: KraftResult<Int> = (KraftResult.Failure(e) as KraftResult<Int>).map { error("must not run") }
        assertSame(e, out.errorOrNull())
    }

    // ── fold ────────────────────────────────────────────────────────────────────────────────

    @Test
    fun `fold takes the success branch`() {
        val out: String = KraftResult.Success(7).fold(onSuccess = { "ok $it" }, onFailure = { "err" })
        assertEquals("ok 7", out)
    }

    @Test
    fun `fold takes the failure branch and receives the error`() {
        // Asserted on the field, not on toString. An earlier version of this test compared
        // against "err AppError.NetworkError.RateLimited(retryAfterSec=30)" and failed,
        // because a Kotlin data class prints its simple name — the test was asserting a
        // formatting detail that no caller depends on, and would have broken on a rename.
        // What callers actually need is that fold hands them the error to read.
        val e = AppError.NetworkError.RateLimited(retryAfterSec = 30)
        val seen: AppError? = (KraftResult.Failure(e) as KraftResult<Int>)
            .fold(onSuccess = { null }, onFailure = { it })
        assertSame(e, seen)
        assertEquals(30L, (seen as AppError.NetworkError.RateLimited).retryAfterSec)
    }

    // ── onSuccess / onFailure ───────────────────────────────────────────────────────────────

    @Test
    fun `onSuccess runs on success and returns the same result for chaining`() {
        var seen = 0
        val r: KraftResult<Int> = KraftResult.Success(5)
        val returned = r.onSuccess { seen = it }
        assertEquals(5, seen)
        assertSame(r, returned)
    }

    @Test
    fun `onSuccess does not run on failure`() {
        var ran = false
        val r: KraftResult<Int> = KraftResult.Failure(AppError.DataError.NotFound)
        val returned = r.onSuccess { ran = true }
        assertFalse(ran)
        assertSame(r, returned)
    }

    @Test
    fun `onFailure runs on failure and receives the error`() {
        val e = AppError.StorageError.DiskFull
        var seen: AppError? = null
        KraftResult.Failure(e).onFailure { seen = it }
        assertSame(e, seen)
    }

    @Test
    fun `onFailure does not run on success`() {
        var ran = false
        KraftResult.Success(1).onFailure { ran = true }
        assertFalse(ran)
    }

    // ── asSuccess / asFailure ───────────────────────────────────────────────────────────────

    @Test
    fun `asSuccess wraps a value`() {
        assertEquals("hi", "hi".asSuccess().getOrNull())
    }

    @Test
    fun `asFailure wraps an error and is typed to Nothing`() {
        val r: KraftResult<Nothing> = AppError.DataError.NotFound.asFailure()
        assertSame(AppError.DataError.NotFound, r.errorOrNull())
    }

    // ── toAppError ──────────────────────────────────────────────────────────────────────────

    @Test
    fun `an unresolvable host maps to NoConnection`() {
        val e = java.net.UnknownHostException("Unable to resolve host api.example.com")
            .toAppError()
        assertSame(AppError.NetworkError.NoConnection, e)
    }

    @Test
    fun `an unreachable network maps to NoConnection`() {
        val e = java.net.SocketException("Network is unreachable").toAppError()
        assertSame(AppError.NetworkError.NoConnection, e)
    }

    @Test
    fun `a socket timeout maps to Timeout`() {
        val e = java.net.SocketTimeoutException("read timed out").toAppError()
        assertSame(AppError.NetworkError.Timeout, e)
    }

    @Test
    fun `a timeout by message alone maps to Timeout even when the type is not a timeout`() {
        // OkHttp surfaces timeouts as a variety of IOException subclasses depending on which
        // phase failed. Branching on the type alone missed those; the message check is what
        // catches them, so it is tested with a type that does not match.
        val e = java.io.IOException("timeout").toAppError()
        assertSame(AppError.NetworkError.Timeout, e)
    }

    @Test
    fun `a bare IOException maps to NoConnection`() {
        // Deliberate and arguable: a bare IOException is also a read-only filesystem. The
        // argument is that in these apps it is overwhelmingly connectivity. Recorded here so
        // that changing the mind is a deliberate act rather than a quiet diff.
        val e = java.io.IOException("something went wrong").toAppError()
        assertSame(AppError.NetworkError.NoConnection, e)
    }

    @Test
    fun `an unrecognised exception maps to Unknown and preserves the throwable`() {
        val original = IllegalStateException("bad")
        val e = original.toAppError()
        assertTrue(e is AppError.Unknown)
        assertSame(original, (e as AppError.Unknown).throwable)
        assertEquals("bad", e.message)
    }

    @Test
    fun `an exception with no message maps to Unknown rather than throwing`() {
        // The `else` arm reads `message?.lowercase().orEmpty()`. A null message is the case
        // that breaks naive implementations of exactly this shape.
        val e = RuntimeException().toAppError()
        assertTrue(e is AppError.Unknown)
    }

    @Test
    fun `a non-network exception is never mapped to a network error`() {
        // Guards the ordering of the when: if the IOException catch-all moved above the
        // message checks, every network failure would still pass — but so would a
        // NullPointerException dressed as one.
        assertFalse(IllegalArgumentException("Unable to resolve host").toAppError() is AppError.NetworkError)
    }

    // ── The error hierarchy itself ──────────────────────────────────────────────────────────

    @Test
    fun `every error is reachable through the AppError type`() {
        // The hierarchy is what keeps presentation free of exception-type checks. If a leaf
        // stopped being an AppError the `when` in every UI would need an else branch, and
        // that else branch is where unhandled states get swallowed.
        val all: List<AppError> = listOf(
            AppError.NetworkError.NoConnection,
            AppError.NetworkError.Timeout,
            AppError.NetworkError.ServerError(500),
            AppError.NetworkError.RateLimited(30),
            AppError.DataError.Parse("bad"),
            AppError.DataError.Validation("empty"),
            AppError.DataError.NotFound,
            AppError.StorageError.DiskFull,
            AppError.StorageError.PermissionDenied,
            AppError.AuthError.Unauthorized,
            AppError.AuthError.Expired,
            AppError.Unknown(),
        )
        assertEquals(12, all.size)
        assertEquals(12, all.map { it::class }.toSet().size)
    }

    @Test
    fun `ServerError and RateLimited carry their fields`() {
        // These two exist to stop a UI from reading a raw HTTP code. If the fields are dropped
        // the code becomes decoration and callers go back to parsing strings.
        val s = AppError.NetworkError.ServerError(code = 503, message = "unavailable")
        assertEquals(503, s.code)
        assertEquals("unavailable", s.message)

        val r = AppError.NetworkError.RateLimited(retryAfterSec = 120)
        assertEquals(120L, r.retryAfterSec)

        // And they must remain optional, since a server is free to omit both.
        assertNull(AppError.NetworkError.ServerError().code)
        assertNull(AppError.NetworkError.RateLimited().retryAfterSec)
    }

    @Test
    fun `DataError Parse keeps the cause for logging`() {
        // The doc says callers should not branch on Unknown's throwable, but this one is kept
        // deliberately: parsing failures are the ones worth reading in a bug report.
        val cause = IllegalArgumentException("expected , at 14")
        assertSame(cause, AppError.DataError.Parse("bad json", cause).cause)
    }
}
