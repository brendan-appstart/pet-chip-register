import { NextResponse } from 'next/server';

/**
 * Baseline security headers on every response. (Next.js Server Actions already
 * enforce an Origin/Host check against the deployment URL, which — combined with
 * our SameSite=Lax session cookie — covers CSRF for state-changing requests.)
 */
export function middleware(): NextResponse {
  const res = NextResponse.next();
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
