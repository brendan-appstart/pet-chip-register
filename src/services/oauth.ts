import { getConfig } from '@/config/env';
import { getOAuthProvider } from '@/providers';
import { systemClock, type Clock } from '@/lib/clock';
import { err, ok, type Result } from '@/lib/result';
import { signInWithVerifiedEmail } from './auth';
import type { RequestContext } from './auth';

const CALLBACK_PATH = '/auth/google/callback';

export function oauthGoogleEnabled(): boolean {
  return getOAuthProvider().enabled;
}

function redirectUri(): string {
  return `${getConfig().appUrl}${CALLBACK_PATH}`;
}

export function buildGoogleAuthUrl(state: string): string {
  return getOAuthProvider().buildAuthUrl({ state, redirectUri: redirectUri() });
}

/**
 * Exchange the callback code for the user's verified Google email and sign them
 * in. A Google account whose email is not verified is rejected.
 */
export async function completeGoogleSignIn(
  input: { code: string } & RequestContext,
  clock: Clock = systemClock,
): Promise<Result<{ sessionToken: string; expiresAt: number }, 'oauth_failed' | 'email_unverified'>> {
  const provider = getOAuthProvider();
  if (!provider.enabled) return err('oauth_failed');

  let info;
  try {
    info = await provider.exchangeCode({ code: input.code, redirectUri: redirectUri() });
  } catch {
    return err('oauth_failed');
  }
  if (!info.emailVerified) return err('email_unverified');

  const res = await signInWithVerifiedEmail(
    { email: info.email, method: 'google', ipHash: input.ipHash, userAgentHash: input.userAgentHash },
    clock,
  );
  if (!res.ok) return err('oauth_failed');
  return ok({ sessionToken: res.value.sessionToken, expiresAt: res.value.expiresAt });
}
