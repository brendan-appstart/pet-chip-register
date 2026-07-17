import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { setupTestDatabase, type TestEnv } from '../helpers/db';
import { submitSuggestion, suggestionsEnabled } from '@/services/suggestions';
import { resetConfigCache } from '@/config/env';
import { resetProviderCache } from '@/providers';

let env: TestEnv;

beforeAll(async () => {
  env = await setupTestDatabase();
});
afterAll(() => env.cleanup());
afterEach(() => {
  delete process.env.GITHUB_ISSUE_TOKEN;
  resetConfigCache();
  resetProviderCache();
  vi.restoreAllMocks();
});

describe('feature suggestions → GitHub issues', () => {
  it('is disabled (no data lost, no crash) when no token is configured', async () => {
    expect(suggestionsEnabled()).toBe(false);
    const res = await submitSuggestion({ title: 'Add SMS alerts', message: 'Please add text alerts.' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('unavailable');
  });

  it('rejects too-short input', async () => {
    const res = await submitSuggestion({ title: 'x', message: 'y' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toBe('invalid');
  });

  it('files a GitHub issue via a server-side token (submitter never logs in)', async () => {
    process.env.GITHUB_ISSUE_TOKEN = 'test-token';
    resetConfigCache();
    resetProviderCache();

    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ html_url: 'https://github.com/x/y/issues/1' }), { status: 201 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await submitSuggestion({
      title: 'Add SMS alerts',
      message: 'Please add text alerts for lost pets.',
      email: 'finder@example.org',
      ipHash: 'ip-1',
    });

    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.url).toContain('/issues/1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      { headers: Record<string, string>; body: string },
    ];
    expect(String(calledUrl)).toContain('/repos/brendan-appstart/pet-chip-register/issues');
    expect(calledInit.headers.Authorization).toContain('test-token');
    expect(calledInit.body).toContain('Add SMS alerts');
  });

  it('rate-limits repeated submissions from one source', async () => {
    process.env.GITHUB_ISSUE_TOKEN = 'test-token';
    resetConfigCache();
    resetProviderCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ html_url: 'u' }), { status: 201 })),
    );

    let limited = false;
    for (let i = 0; i < 7; i++) {
      const r = await submitSuggestion({ title: 'Idea number', message: 'A valid suggestion body.', ipHash: 'flood' });
      if (!r.ok && r.error === 'rate_limited') limited = true;
    }
    expect(limited).toBe(true);
  });
});
