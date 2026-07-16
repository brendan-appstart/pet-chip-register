import { describe, expect, it } from 'vitest';
import { emailDomain, isValidEmail, normalizeEmail } from '@/domain/auth/email';

describe('email normalization', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Jo@Example.ORG ')).toBe('jo@example.org');
  });

  it('accepts plausible emails and rejects malformed ones', () => {
    expect(isValidEmail('jo@example.org')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('no-at-sign')).toBe(false);
    expect(isValidEmail('two@@example.org')).toBe(false);
    expect(isValidEmail('nope@nodot')).toBe(false);
  });

  it('extracts the domain', () => {
    expect(emailDomain('jo@example.org')).toBe('example.org');
  });
});
