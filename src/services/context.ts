import { hashClientAttribute } from '@/security/hash';
import type { RequestContext } from './auth';

/**
 * Build a request context from raw client attributes. IP and user-agent are
 * hashed (never stored raw) for rate-limiting and audit. Lives in the service
 * layer so the app never imports the security/crypto layers directly.
 */
export function clientContext(ip?: string | null, userAgent?: string | null): RequestContext {
  return {
    ipHash: hashClientAttribute(ip),
    userAgentHash: hashClientAttribute(userAgent),
  };
}
