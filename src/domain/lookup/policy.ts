/**
 * The lookup response policy is a privacy invariant, isolated here so it is
 * obvious and testable: a finder who searches a chip number learns NOTHING about
 * whether it is registered or who owns it. The acknowledgement is identical for
 * a match and a no-match. Only the owner is told that someone searched.
 */
export const NEUTRAL_LOOKUP_ACK =
  "Thank you. If this pet is registered with us, we've notified the owner — they may reach out to you. There's nothing more you need to do.";

export type LookupOutcome = 'matched' | 'no_match' | 'rate_limited' | 'challenged';

/**
 * What the finder is shown. Note there is no `matched` boolean and no pet/owner
 * data — every successful lookup returns the same acknowledgement. Only rate
 * limiting produces a visibly different response (a retry hint), and it reveals
 * nothing about registration.
 */
export interface LookupAck {
  acknowledged: boolean;
  message: string;
  retryAfterSeconds?: number;
}

export function neutralAck(): LookupAck {
  return { acknowledged: true, message: NEUTRAL_LOOKUP_ACK };
}

export function rateLimitedAck(retryAfterSeconds: number): LookupAck {
  return {
    acknowledged: false,
    message: 'Too many lookups from this connection. Please wait a moment and try again.',
    retryAfterSeconds,
  };
}
