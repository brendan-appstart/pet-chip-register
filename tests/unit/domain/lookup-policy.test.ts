import { describe, expect, it } from 'vitest';
import { NEUTRAL_LOOKUP_ACK, neutralAck, rateLimitedAck } from '@/domain/lookup/policy';

describe('lookup response policy', () => {
  it('the neutral ack reveals nothing about registration or ownership', () => {
    const ack = neutralAck();
    expect(ack.acknowledged).toBe(true);
    expect(ack.message).toBe(NEUTRAL_LOOKUP_ACK);
    // No fields that could distinguish match from no-match.
    expect(ack).not.toHaveProperty('matched');
    expect(ack).not.toHaveProperty('petId');
    expect(ack.retryAfterSeconds).toBeUndefined();
  });

  it('a rate-limited ack carries only a retry hint', () => {
    const ack = rateLimitedAck(42);
    expect(ack.acknowledged).toBe(false);
    expect(ack.retryAfterSeconds).toBe(42);
  });
});
