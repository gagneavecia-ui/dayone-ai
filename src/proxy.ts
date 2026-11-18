import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'd1_session';

const PROTECTED_PREFIXES = [
  '/onboarding',
  '/dashboard',
  '/goals',
  '/missions',
  '/coach',
  '/progress',
  '/review',
  '/settings',
  '/admin',
];

/**
 * First layer of route protection: redirects unauthenticated visitors away
 * from private routes. Presence of the session cookie is a UX-level check —
 * the real authorization happens on every API call (Firebase ID token
 * verification) and in the Firestore security rules.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except static assets and API routes.
    '/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.webmanifest|sw.js|offline.html|robots.txt|logo.svg).*)',
  ],
};
