/**
 * Time is injected rather than read directly from `Date.now()` in domain logic,
 * so token-expiry and audit-ordering behaviour is deterministically testable.
 */
export interface Clock {
  now(): number; // epoch milliseconds
}

export const systemClock: Clock = {
  now: () => Date.now(),
};

/** A fixed clock for tests. */
export function fixedClock(atMs: number): Clock {
  return { now: () => atMs };
}
