/**
 * Edge Middleware tests — route protection via auth_status cookie.
 *
 * Run with: npx jest __tests__/middleware.test.ts --verbose
 */

// ---------------------------------------------------------------------------
// Mock next/server since NextRequest depends on the Web Request API
// which is not available in jsdom.
// ---------------------------------------------------------------------------
const mockRedirect = jest.fn()
const mockNext = jest.fn()

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number
    _headers: Map<string, string>

    constructor(body?: any, init?: { status?: number; headers?: Record<string, string> }) {
      this.status = init?.status ?? 200
      this._headers = new Map(Object.entries(init?.headers ?? {}))
    }

    get headers() {
      return {
        get: (key: string) => this._headers.get(key) ?? null,
      }
    }

    static next() {
      const resp = new MockNextResponse(null, { status: 200 })
      mockNext()
      return resp
    }

    static redirect(url: URL | string) {
      const location = typeof url === 'string' ? url : url.toString()
      const resp = new MockNextResponse(null, {
        status: 307,
        headers: { location },
      })
      mockRedirect(location)
      return resp
    }
  }

  class MockNextRequest {
    nextUrl: URL
    cookies: Map<string, string>

    constructor(url: URL | string) {
      this.nextUrl = typeof url === 'string' ? new URL(url) : url
      this.cookies = new Map()
    }
  }

  // Make cookies.get() return { value } shape like real NextRequest
  MockNextRequest.prototype.cookies = Object.create(null)
  Object.defineProperty(MockNextRequest.prototype, 'cookies', {
    get() {
      return this._cookies
    },
    set(val: any) {
      this._cookies = val
    },
  })

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
  }
})

// ---------------------------------------------------------------------------
// Helper to create a mock NextRequest with cookies
// ---------------------------------------------------------------------------
function createMockRequest(pathname: string, cookies: Record<string, string> = {}) {
  const url = new URL(pathname, 'http://localhost:3000')
  // Add clone() so middleware can do request.nextUrl.clone()
  ;(url as any).clone = () => new URL(url.toString())

  // Build a lightweight request-like object that middleware consumes
  const req = {
    nextUrl: url,
    cookies: {
      get(name: string) {
        const val = cookies[name]
        return val != null ? { value: val } : undefined
      },
    },
  }
  return req as any
}

// Import middleware AFTER mocking next/server
import { middleware } from '@/middleware'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockRedirect.mockClear()
  mockNext.mockClear()
})

describe('Edge Middleware — route protection', () => {
  test('unauthenticated user on protected route redirects to /login', () => {
    const req = createMockRequest('/patient/dashboard')
    const resp = middleware(req)

    expect(resp.status).toBe(307) // Next.js redirect default
    const location = resp.headers.get('location') ?? ''
    expect(location).toContain('/login')
  })

  test('authenticated patient can access /patient routes', () => {
    const req = createMockRequest('/patient/dashboard', { auth_status: 'patient' })
    const resp = middleware(req)

    // NextResponse.next() returns a 200
    expect(resp.status).toBe(200)
  })

  test('patient trying to access /staff routes gets redirected to correct dashboard', () => {
    const req = createMockRequest('/staff/dashboard', { auth_status: 'patient' })
    const resp = middleware(req)

    expect(resp.status).toBe(307)
    const location = resp.headers.get('location') ?? ''
    expect(location).toContain('/patient/dashboard')
  })

  test('public routes always pass through (no middleware match)', () => {
    // The middleware config.matcher only runs on /patient/*, /staff/*, /owner/*
    // so /login should not even trigger the middleware. We test by directly calling
    // the middleware function — it should let the request through since /login
    // doesn't match any protected prefix.
    const req = createMockRequest('/login')
    const resp = middleware(req)

    expect(resp.status).toBe(200) // NextResponse.next()
  })

  test('owner can access /owner routes', () => {
    const req = createMockRequest('/owner/dashboard', { auth_status: 'owner' })
    const resp = middleware(req)

    expect(resp.status).toBe(200)
  })

  test('staff trying to access /owner routes gets redirected', () => {
    const req = createMockRequest('/owner/settings', { auth_status: 'staff' })
    const resp = middleware(req)

    expect(resp.status).toBe(307)
    const location = resp.headers.get('location') ?? ''
    expect(location).toContain('/staff/dashboard')
  })
})
