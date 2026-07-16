/**
 * Email normalization for the blind index. We lowercase and trim so that the
 * same address always resolves to the same account, without attempting
 * provider-specific canonicalization (e.g. Gmail dot-stripping), which would
 * surprise users and vary by provider.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

// Deliberately permissive: we require a single @ with non-empty local and domain
// parts and a dot in the domain. Real validation is "can we deliver a link to
// it", which the email send step establishes.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(normalized: string): boolean {
  return EMAIL_PATTERN.test(normalized) && normalized.length <= 254;
}

export function emailDomain(normalized: string): string | undefined {
  const at = normalized.lastIndexOf('@');
  return at >= 0 ? normalized.slice(at + 1) : undefined;
}
