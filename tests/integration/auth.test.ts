import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupTestDatabase, type TestEnv } from '../helpers/db';
import { requestMagicLink, verifyMagicLink } from '@/services/auth';

let env: TestEnv;

beforeAll(async () => {
  env = await setupTestDatabase();
});
afterAll(() => env.cleanup());

function tokenFromLink(text: string): string {
  const m = /\/auth\/verify\?token=([^\s]+)/.exec(text);
  if (!m || !m[1]) throw new Error('no token in email');
  return decodeURIComponent(m[1]);
}

describe('magic-link auth', () => {
  it('emails a sign-in link and verifies it once', async () => {
    const res = await requestMagicLink({ email: 'user@example.org' });
    expect(res.ok).toBe(true);

    const msg = env.readOutbox().find((m) => m.to === 'user@example.org');
    expect(msg).toBeDefined();
    const token = tokenFromLink(msg!.text);

    const verified = await verifyMagicLink({ rawToken: token });
    expect(verified.ok).toBe(true);
  });

  it('rejects a reused (single-use) token', async () => {
    await requestMagicLink({ email: 'reuse@example.org' });
    const msg = env.readOutbox().findLast((m) => m.to === 'reuse@example.org');
    const token = tokenFromLink(msg!.text);

    const first = await verifyMagicLink({ rawToken: token });
    const second = await verifyMagicLink({ rawToken: token });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
  });

  it('lets exactly one of two concurrent verifications win', async () => {
    await requestMagicLink({ email: 'race@example.org' });
    const msg = env.readOutbox().findLast((m) => m.to === 'race@example.org');
    const token = tokenFromLink(msg!.text);

    const [a, b] = await Promise.all([
      verifyMagicLink({ rawToken: token }),
      verifyMagicLink({ rawToken: token }),
    ]);
    expect([a.ok, b.ok].filter(Boolean).length).toBe(1);
  });

  it('does not disclose account existence and rejects invalid emails', async () => {
    const existing = await requestMagicLink({ email: 'user@example.org' });
    const unknown = await requestMagicLink({ email: 'nobody@example.org' });
    expect(existing.ok).toBe(true);
    expect(unknown.ok).toBe(true); // same neutral outcome either way

    const bad = await requestMagicLink({ email: 'not-an-email' });
    expect(bad.ok).toBe(false);
  });
});
