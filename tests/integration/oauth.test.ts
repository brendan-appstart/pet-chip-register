import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { setupTestDatabase, type TestEnv } from '../helpers/db';
import { resolveSession, signInWithVerifiedEmail } from '@/services/auth';
import { completeGoogleSignIn, oauthGoogleEnabled } from '@/services/oauth';
import { resetConfigCache } from '@/config/env';
import { resetProviderCache } from '@/providers';

let env: TestEnv;

beforeAll(async () => {
  env = await setupTestDatabase();
});
afterAll(() => env.cleanup());
afterEach(() => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  resetConfigCache();
  resetProviderCache();
  vi.restoreAllMocks();
});

function enableGoogle(): void {
  process.env.GOOGLE_CLIENT_ID = 'client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
  resetConfigCache();
  resetProviderCache();
}

function mockGoogle(email: string, verified: boolean): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL) => {
      const u = String(url);
      if (u.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'access-token' }), { status: 200 });
      }
      if (u.includes('userinfo')) {
        return new Response(JSON.stringify({ email, email_verified: verified }), { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }),
  );
}

describe('Google OAuth sign-in', () => {
  it('is disabled without credentials', () => {
    expect(oauthGoogleEnabled()).toBe(false);
  });

  it('maps one account per email (shared with magic-link), case/normalization aware', async () => {
    const r1 = await signInWithVerifiedEmail({ email: 'Gmail.User@example.org', method: 'google' });
    const r2 = await signInWithVerifiedEmail({ email: 'gmail.user@example.org', method: 'google' });
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.value.ownerId).toBe(r2.value.ownerId);
      const owner = await resolveSession(r1.value.sessionToken);
      expect(owner?.id).toBe(r1.value.ownerId);
    }
  });

  it('completes sign-in with a verified Google email and mints a session', async () => {
    enableGoogle();
    mockGoogle('newperson@example.org', true);
    const res = await completeGoogleSignIn({ code: 'auth-code' });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const owner = await resolveSession(res.value.sessionToken);
      expect(owner).not.toBeNull();
    }
  });

  it('rejects an unverified Google email', async () => {
    enableGoogle();
    mockGoogle('unverified@example.org', false);
    const res = await completeGoogleSignIn({ code: 'auth-code' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('email_unverified');
  });
});
