/**
 * Rate limiting for enumeration resistance on the chip lookup and abuse control
 * on magic-link requests. The in-memory fixed-window limiter needs no external
 * dependency (good for single-instance self-hosting). A shared/DB-backed limiter
 * is the documented path for multi-instance deployments.
 */
export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
  cost?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export interface RateLimiter {
  readonly name: string;
  consume(key: string, policy: RateLimitPolicy): Promise<RateLimitResult>;
}

export function createInMemoryRateLimiter(now: () => number = Date.now): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    name: 'memory',
    async consume(key, policy) {
      const cost = policy.cost ?? 1;
      const t = now();
      let bucket = buckets.get(key);
      if (!bucket || t >= bucket.resetAt) {
        bucket = { count: 0, resetAt: t + policy.windowMs };
        buckets.set(key, bucket);
      }
      // Opportunistic pruning so the map cannot grow without bound.
      if (buckets.size > 10_000) {
        for (const [k, v] of buckets) if (t >= v.resetAt) buckets.delete(k);
      }
      bucket.count += cost;
      const allowed = bucket.count <= policy.limit;
      return {
        allowed,
        remaining: Math.max(0, policy.limit - bucket.count),
        retryAfterMs: allowed ? 0 : Math.max(0, bucket.resetAt - t),
      };
    },
  };
}
