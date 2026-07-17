import { getIssueTracker, getRateLimiter } from '@/providers';
import { getDb } from '@/db/client';
import { appendAudit } from '@/db/repositories/audit';
import { systemClock, type Clock } from '@/lib/clock';
import { err, ok, type Result } from '@/lib/result';
import type { RequestContext } from './auth';

const TITLE_MAX = 140;
const MESSAGE_MAX = 4000;

/** Whether the suggestion feature is available (a tracker token is configured). */
export function suggestionsEnabled(): boolean {
  return getIssueTracker().enabled;
}

/**
 * Submit a public feature suggestion, which is filed as a GitHub issue via a
 * server-side token — the submitter never logs in to GitHub. Rate-limited per
 * IP and length-bounded to blunt spam.
 */
export async function submitSuggestion(
  input: { title: string; message: string; email?: string } & RequestContext,
  clock: Clock = systemClock,
): Promise<Result<{ url?: string }, 'invalid' | 'rate_limited' | 'unavailable'>> {
  const title = input.title.trim();
  const message = input.message.trim();
  if (title.length < 3 || title.length > TITLE_MAX) return err('invalid');
  if (message.length < 5 || message.length > MESSAGE_MAX) return err('invalid');

  const tracker = getIssueTracker();
  if (!tracker.enabled) return err('unavailable');

  const rl = await getRateLimiter().consume(`suggest:ip:${input.ipHash ?? 'unknown'}`, {
    limit: 5,
    windowMs: 60 * 60_000,
  });
  if (!rl.allowed) return err('rate_limited');

  const now = clock.now();
  try {
    const { url } = await tracker.createIssue({
      title: `[Suggestion] ${title}`,
      body: buildBody(message, input.email),
      labels: ['suggestion', 'from-website'],
    });
    await appendAudit(getDb(), {
      actorType: 'system',
      action: 'SUGGESTION_SUBMITTED',
      ipHash: input.ipHash ?? null,
      occurredAt: now,
    });
    return ok({ url });
  } catch {
    return err('unavailable');
  }
}

function buildBody(message: string, email?: string): string {
  const lines = [message, '', '---', '_Submitted via the suggestion form on the website._'];
  if (email && email.trim() !== '') lines.push(`_Contact (optional): ${email.trim()}_`);
  return lines.join('\n');
}
