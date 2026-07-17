import { NextResponse } from 'next/server';
import { getConfig } from '@/config/env';
import { newOpaqueToken } from '@/lib/ids';
import { buildGoogleAuthUrl, oauthGoogleEnabled } from '@/services/oauth';

/** Start Google OAuth: set a CSRF `state` cookie and redirect to Google. */
export async function GET(req: Request): Promise<Response> {
  if (!oauthGoogleEnabled()) {
    return NextResponse.redirect(new URL('/auth/request', req.url));
  }
  const state = newOpaqueToken(16);
  const res = NextResponse.redirect(buildGoogleAuthUrl(state));
  res.cookies.set('opr_oauth_state', state, {
    httpOnly: true,
    secure: getConfig().isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
