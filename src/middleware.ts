import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { UserRole } from '@prisma/client'

/**
 * Route permission mapping - inline definition to avoid import issues in middleware
 * This mirrors the configuration in src/lib/permissions.ts
 */
interface RoutePermission {
  pattern: RegExp
  roles: UserRole[]  // Roles that can access this route
}

// Routes that require specific roles
const PROTECTED_ROUTES: RoutePermission[] = [
  // Manager dashboard - only Managers and Admins can access
  { pattern: /^\/manager/, roles: ['ADMIN', 'MANAGER'] },

  // Review page - only Compliance Officers and Admins can access
  { pattern: /^\/cases\/review$/, roles: ['ADMIN', 'COMPLIANCE_OFFICER'] },

  // User management - only Admins
  { pattern: /^\/settings\/users/, roles: ['ADMIN'] },

  // Audit logs - only Admins and Auditors
  { pattern: /^\/settings\/audit/, roles: ['ADMIN', 'AUDITOR'] },

  // Organization settings - only Admins
  { pattern: /^\/settings\/organization/, roles: ['ADMIN'] },
]

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/portal',  // Client portal has its own auth
  '/api/auth',  // NextAuth routes
]

/**
 * Check if a path matches any public route patterns
 */
function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => path === route || path.startsWith(route + '/') || path.startsWith(route + '?'))
}

/**
 * Check if a role can access a specific protected route
 */
function canAccessRoute(role: string | undefined, path: string): boolean {
  // Find matching protected route
  const protectedRoute = PROTECTED_ROUTES.find(r => r.pattern.test(path))

  // If not a specifically protected route, allow access (general auth required)
  if (!protectedRoute) return true

  // If no role, deny access
  if (!role) return false

  // Check if user's role is in the allowed roles
  return protectedRoute.roles.includes(role as UserRole)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Allow static files and API routes (except specific ones)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||  // Static files
    (pathname.startsWith('/api/') && !pathname.startsWith('/api/v1/'))  // Internal API routes handled by NextAuth
  ) {
    return NextResponse.next()
  }

  // Get the session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Redirect to login if not authenticated
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check role-based access for protected routes
  const userRole = token.role as string | undefined
  if (!canAccessRoute(userRole, pathname)) {
    // Redirect to dashboard with access denied message
    const dashboardUrl = new URL('/dashboard', request.url)
    dashboardUrl.searchParams.set('error', 'access_denied')
    return NextResponse.redirect(dashboardUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
