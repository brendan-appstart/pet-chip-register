import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getConfig } from '@/config/env';
import { SESSION_COOKIE } from '@/services/auth';
import { completeGoogleSignIn } from '@/services/oauth';
import { getRequestContext } from '../../../_lib/session';

/** Google OAuth callback: verify the CSRF state, sign the user in, set session. */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const jar = await cookies();
  const cookieState = jar.get('opr_oauth_state')?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL('/auth/request?error=oauth', req.url));
  }

  const ctx = await getRequestContext();
  const res = await completeGoogleSignIn({ code, ipHash: ctx.ipHash, userAgentHash: ctx.userAgentHash });
  if (!res.ok) {
    return NextResponse.redirect(new URL(`/auth/request?error=${res.error}`, req.url));
  }

  const response = NextResponse.redirect(new URL('/owner', req.url));
  response.cookies.set(SESSION_COOKIE, res.value.sessionToken, {
    httpOnly: true,
    secure: getConfig().isProduction,
    sameSite: 'lax',
    path: '/',
    expires: new Date(res.value.expiresAt),
  });
  response.cookies.delete('opr_oauth_state');
  return response;
}
