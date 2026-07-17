import { getConfig } from '@/config/env';
import {
  createConsoleEmailProvider,
  createSmtpEmailProvider,
  type EmailProvider,
} from './email';
import { createNoopSmsProvider, type SmsProvider } from './sms';
import { createIdentityTranslator, type Translator } from './translate';
import {
  createLocalFsStorage,
  createS3Storage,
  createVercelBlobStorage,
  type Storage,
} from './storage';
import { createHtmlPosterGenerator, type PosterGenerator } from './poster';
import { createInMemoryRateLimiter, type RateLimiter } from './ratelimit';
import {
  createGitHubIssueTracker,
  createNoopIssueTracker,
  type IssueTracker,
} from './issues';

/**
 * Provider composition root. Call sites ask for a provider by role and receive
 * the implementation selected by configuration — swapping a vendor is a config
 * change, never a code change.
 */

let email: EmailProvider | undefined;
let sms: SmsProvider | undefined;
let translator: Translator | undefined;
let storage: Storage | undefined;
let poster: PosterGenerator | undefined;
let rateLimiter: RateLimiter | undefined;

export function getEmailProvider(): EmailProvider {
  if (!email) {
    const cfg = getConfig();
    email =
      cfg.email.provider === 'smtp'
        ? createSmtpEmailProvider({
            from: cfg.email.from,
            host: cfg.email.smtp.host ?? '',
            port: cfg.email.smtp.port,
            secure: cfg.email.smtp.secure,
            user: cfg.email.smtp.user,
            password: cfg.email.smtp.password,
          })
        : createConsoleEmailProvider({ from: cfg.email.from, outboxPath: cfg.email.devOutbox });
  }
  return email;
}

export function getSmsProvider(): SmsProvider {
  sms ??= createNoopSmsProvider();
  return sms;
}

export function getTranslator(): Translator {
  translator ??= createIdentityTranslator();
  return translator;
}

export function getStorage(): Storage {
  if (!storage) {
    const cfg = getConfig();
    switch (cfg.storage.provider) {
      case 'vercel-blob':
        storage = createVercelBlobStorage({ token: cfg.storage.blobToken });
        break;
      case 's3':
        storage = createS3Storage();
        break;
      default:
        storage = createLocalFsStorage({ baseDir: cfg.storage.localDir });
    }
  }
  return storage;
}

export function getPosterGenerator(): PosterGenerator {
  poster ??= createHtmlPosterGenerator();
  return poster;
}

export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    const cfg = getConfig();
    if (cfg.rateLimiter === 'db') {
      // A shared/DB-backed limiter is a documented follow-up for multi-instance
      // deployments; fall back to in-memory so a single instance still works.
      console.warn('[providers] RATE_LIMITER=db is not built yet; using in-memory limiter.');
    }
    rateLimiter = createInMemoryRateLimiter();
  }
  return rateLimiter;
}

let issueTracker: IssueTracker | undefined;

export function getIssueTracker(): IssueTracker {
  if (!issueTracker) {
    const cfg = getConfig();
    issueTracker = cfg.issues.githubToken
      ? createGitHubIssueTracker({ token: cfg.issues.githubToken, repo: cfg.issues.githubRepo })
      : createNoopIssueTracker();
  }
  return issueTracker;
}

/** Test helper. */
export function resetProviderCache(): void {
  email = sms = translator = storage = poster = rateLimiter = issueTracker = undefined;
}

export type { EmailProvider, EmailMessage } from './email';
export type { SmsProvider } from './sms';
export type { Translator } from './translate';
export type { Storage } from './storage';
export type { PosterGenerator, PosterInput } from './poster';
export type { RateLimiter, RateLimitPolicy, RateLimitResult } from './ratelimit';
export type { IssueTracker, IssueSubmission } from './issues';
