// ============================================================================
// Proxy — Route protection (Next.js 16 proxy convention)
// ============================================================================
//
// This file replaces middleware.ts (deprecated in Next.js 16).
// It uses lightweight JWT cookie checking instead of importing the full
// auth module, which would pull in Node.js-only dependencies (bcryptjs,
// googleapis) that cause edge runtime errors.
// ============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Decode the NextAuth session token to check if the user is authenticated.
 * We read the JWT payload without verifying the signature here —
 * full verification happens server-side in the auth() calls.
 */
function getSessionFromCookie(req: NextRequest): {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  mustChangePassword?: boolean;
} | null {
  // NextAuth v5 stores the session in a cookie named __Secure-authjs.session-token
  // or authjs.session-token (non-HTTPS)
  const secureCookie = req.cookies.get('__Secure-authjs.session-token');
  const cookie = req.cookies.get('authjs.session-token');
  const token = secureCookie?.value || cookie?.value;

  if (!token) return null;

  try {
    // NextAuth v5 JWTs are JWE (encrypted), not plain JWTs.
    // We can't decode them here without the secret.
    // Instead, we just check for the cookie's existence as a proxy check.
    // Full auth verification happens in server components/actions via auth().
    return { role: 'UNKNOWN' };
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes that don't need authentication
  const publicRoutes = ['/login', '/api/auth'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if user has a session cookie
  const session = getSessionFromCookie(req);

  if (!session) {
    const loginUrl = new URL('/login', req.nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control is enforced server-side in the actual page
  // components and server actions via auth(). The proxy only handles the
  // basic "is user logged in?" redirect to avoid importing heavy deps.

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
