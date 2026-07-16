import { describe, expect, it } from 'vitest';
import { chipLast4, isValidChip, normalizeChip, parseChip } from '@/domain/pets/chip';

describe('chip normalization', () => {
  it('strips spaces, dashes, dots and uppercases', () => {
    expect(normalizeChip('  985-141 000.000001 ')).toBe('985141000000001');
    expect(normalizeChip('abc123def45')).toBe('ABC123DEF45');
  });

  it('validates length and charset (9–15 alphanumeric)', () => {
    expect(isValidChip('985141000000001')).toBe(true); // 15 digits (ISO)
    expect(isValidChip('123456789')).toBe(true); // 9
    expect(isValidChip('12345678')).toBe(false); // too short
    expect(isValidChip('1234567890123456')).toBe(false); // too long
    expect(isValidChip('12345678!')).toBe(false); // bad char
  });

  it('derives last-4 for the owner UI', () => {
    expect(chipLast4('985141000000001')).toBe('0001');
  });

  it('parseChip returns null for invalid input and normalized+last4 for valid', () => {
    expect(parseChip('nope')).toBeNull();
    expect(parseChip(' 985 141 000 000 001 ')).toEqual({
      normalized: '985141000000001',
      last4: '0001',
    });
  });
});
