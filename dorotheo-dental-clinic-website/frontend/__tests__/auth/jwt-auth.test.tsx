/**
 * JWT Authentication tests — AuthProvider + authenticatedFetch behaviour.
 *
 * Run with: npx jest __tests__/auth/jwt-auth.test.ts --verbose
 */

import { render, screen, act, waitFor } from '@testing-library/react'
import React from 'react'
import { AuthProvider, useAuth } from '@/lib/auth'
import { api, setAuthInterceptor, clearAuthInterceptor } from '@/lib/api'

// ---------------------------------------------------------------------------
// Global mock for fetch
// ---------------------------------------------------------------------------
const originalFetch = global.fetch
beforeEach(() => {
  global.fetch = jest.fn()
  localStorage.clear()
  document.cookie = 'auth_status=; path=/; max-age=0'
  clearAuthInterceptor()
})
afterEach(() => {
  global.fetch = originalFetch
})

// ---------------------------------------------------------------------------
// Helper: A component that exposes AuthContext values for testing
// ---------------------------------------------------------------------------
function AuthConsumer({ onAuth }: { onAuth: (ctx: ReturnType<typeof useAuth>) => void }) {
  const ctx = useAuth()
  React.useEffect(() => { onAuth(ctx) }, [ctx, onAuth])
  return <div data-testid="user-type">{ctx.user?.user_type ?? 'none'}</div>
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JWT Auth — AuthProvider', () => {
  test('login stores access token in memory, NOT in localStorage', async () => {
    // Mock jwtLogin response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access: 'test_access_jwt_token_123',
        user: {
          id: 1, username: 'patient1', email: 'p@t.com',
          user_type: 'patient', first_name: 'P', last_name: 'T',
        },
        legacy_token: 'legacy_abc',
      }),
    })
    // Mock the silent-refresh on mount (fails = no existing session)
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 })

    let authCtx: ReturnType<typeof useAuth> | null = null

    await act(async () => {
      render(
        <AuthProvider>
          <AuthConsumer onAuth={(ctx) => { authCtx = ctx }} />
        </AuthProvider>
      )
    })

    // Login
    await act(async () => {
      await authCtx!.login('patient1', 'testpass123')
    })

    // Access token should be in context
    expect(authCtx!.token).toBe('test_access_jwt_token_123')
    // But NOT in localStorage
    expect(localStorage.getItem('token')).not.toBe('test_access_jwt_token_123')
  })

  test('login sets auth_status session cookie', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access: 'jwt_tok',
        user: { id: 1, username: 'p1', email: 'p@t.com', user_type: 'patient', first_name: 'P', last_name: 'T' },
        legacy_token: 'old',
      }),
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 })

    let authCtx: ReturnType<typeof useAuth> | null = null

    await act(async () => {
      render(
        <AuthProvider>
          <AuthConsumer onAuth={(ctx) => { authCtx = ctx }} />
        </AuthProvider>
      )
    })

    await act(async () => {
      await authCtx!.login('p1', 'pass')
    })

    expect(document.cookie).toContain('auth_status=patient')
  })

  test('logout clears state, cookie, and localStorage', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access: 'jwt_tok',
        user: { id: 1, username: 'p1', email: 'p@t.com', user_type: 'patient', first_name: 'P', last_name: 'T' },
        legacy_token: 'old',
      }),
    })
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 })
    // Mock the logout endpoint call
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Logged out' }),
    })

    let authCtx: ReturnType<typeof useAuth> | null = null

    await act(async () => {
      render(
        <AuthProvider>
          <AuthConsumer onAuth={(ctx) => { authCtx = ctx }} />
        </AuthProvider>
      )
    })

    await act(async () => { await authCtx!.login('p1', 'pass') })

    // Logout sets window.location.href which throws in jsdom — catch the
    // navigation error so we can still inspect the cleaned-up state.
    try {
      await act(async () => { authCtx!.logout() })
    } catch {
      // jsdom "Not implemented: navigation" errors are expected
    }

    // Even if the redirect throws, state should already be cleared
    expect(authCtx!.token).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    expect(document.cookie).not.toContain('auth_status=patient')
  })

  test('silent refresh on mount restores session', async () => {
    // Seed localStorage with a user (simulates previous session)
    localStorage.setItem('user', JSON.stringify({
      id: 1, username: 'p1', email: 'p@t.com', user_type: 'patient',
      first_name: 'P', last_name: 'T',
    }))

    // Mock api.jwtRefresh → returns new access token
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access: 'refreshed_token_xyz' }),
    })

    let authCtx: ReturnType<typeof useAuth> | null = null

    await act(async () => {
      render(
        <AuthProvider>
          <AuthConsumer onAuth={(ctx) => { authCtx = ctx }} />
        </AuthProvider>
      )
    })

    // Wait for the silent refresh effect
    await waitFor(() => {
      expect(authCtx!.token).toBe('refreshed_token_xyz')
    })
    expect(authCtx!.user?.username).toBe('p1')
  })
})

describe('JWT Auth — authenticatedFetch', () => {
  test('401 triggers refresh and retries', async () => {
    const onRefresh = jest.fn()
    const onFail = jest.fn()
    setAuthInterceptor('old_token', onRefresh, onFail)

    // First call → 401
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ status: 401, ok: false })
    // Refresh call → success
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access: 'new_token_after_refresh' }),
    })
    // Retry call → 200
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ data: 'success' }),
    })

    const { authenticatedFetch } = await import('@/lib/api')
    const resp = await authenticatedFetch('http://localhost:8000/api/profile/')

    expect(resp.status).toBe(200)
    expect(onRefresh).toHaveBeenCalledWith('new_token_after_refresh')
    // fetch should have been called 3 times: original, refresh, retry
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  test('refresh failure triggers auth failure callback', async () => {
    const onRefresh = jest.fn()
    const onFail = jest.fn()
    setAuthInterceptor('old_token', onRefresh, onFail)

    // First call → 401
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ status: 401, ok: false })
    // Refresh call → fails
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 401 })

    const { authenticatedFetch } = await import('@/lib/api')
    const resp = await authenticatedFetch('http://localhost:8000/api/profile/')

    expect(resp.status).toBe(401) // original 401 returned
    expect(onFail).toHaveBeenCalled()
    expect(onRefresh).not.toHaveBeenCalled()
  })
})
