import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Edge Middleware — runs on Vercel's Edge Network before the page renders.
 *
 * Protects /patient/*, /staff/*, and /owner/* routes by checking the
 * `auth_status` cookie (set by the AuthProvider after JWT login).
 *
 * - No cookie on a protected route → redirect to /login
 * - Wrong role for the route → redirect to the correct dashboard
 * - Public routes always pass through
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authStatus = request.cookies.get('auth_status')?.value // e.g. "patient", "staff", "owner"

  // Determine which role prefix the path falls under
  const rolePrefix = getRouteRolePrefix(pathname)

  // If the path doesn't match a protected prefix, let it through
  if (!rolePrefix) {
    return NextResponse.next()
  }

  // No auth cookie → redirect to login
  if (!authStatus) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role mismatch → redirect to the correct dashboard
  if (authStatus !== rolePrefix) {
    const correctUrl = request.nextUrl.clone()
    correctUrl.pathname = `/${authStatus}/dashboard`
    return NextResponse.redirect(correctUrl)
  }

  // Authenticated and correct role — proceed
  return NextResponse.next()
}

/**
 * Extract the role prefix from a pathname, or null if it's not a protected route.
 */
function getRouteRolePrefix(pathname: string): string | null {
  if (pathname.startsWith('/patient')) return 'patient'
  if (pathname.startsWith('/staff')) return 'staff'
  if (pathname.startsWith('/owner')) return 'owner'
  return null
}

// Only run middleware on protected route prefixes
export const config = {
  matcher: ['/patient/:path*', '/staff/:path*', '/owner/:path*'],
}
