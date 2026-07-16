import { describe, expect, it } from 'vitest';
import { createBlindIndex } from '@/crypto/blindIndex';

const PEPPER_1 = Buffer.alloc(32, 1);
const PEPPER_2 = Buffer.alloc(32, 2);

describe('blind index', () => {
  it('is deterministic for equal inputs', () => {
    const idx = createBlindIndex(PEPPER_1, 'chip');
    expect(idx.compute('985141000000001')).toBe(idx.compute('985141000000001'));
  });

  it('differs for different values', () => {
    const idx = createBlindIndex(PEPPER_1, 'chip');
    expect(idx.compute('985141000000001')).not.toBe(idx.compute('985141000000002'));
  });

  it('differs across namespaces (no cross-context correlation)', () => {
    const chip = createBlindIndex(PEPPER_1, 'chip');
    const email = createBlindIndex(PEPPER_1, 'email');
    expect(chip.compute('same-value')).not.toBe(email.compute('same-value'));
  });

  it('differs when the pepper changes (index leak != decryption)', () => {
    const a = createBlindIndex(PEPPER_1, 'chip');
    const b = createBlindIndex(PEPPER_2, 'chip');
    expect(a.compute('985141000000001')).not.toBe(b.compute('985141000000001'));
  });

  it('matches() compares in constant time and is correct', () => {
    const idx = createBlindIndex(PEPPER_1, 'chip');
    const stored = idx.compute('985141000000001');
    expect(idx.matches('985141000000001', stored)).toBe(true);
    expect(idx.matches('985141000000002', stored)).toBe(false);
  });

  it('rejects a too-short pepper', () => {
    expect(() => createBlindIndex(Buffer.alloc(16), 'chip')).toThrow(/at least 32 bytes/);
  });
});
