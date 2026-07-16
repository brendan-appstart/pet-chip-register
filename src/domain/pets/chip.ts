/**
 * Microchip-number normalization. Numbers are printed and read by many people
 * and systems (vets, shelters, scanners), so the same physical chip can arrive
 * with spaces, dashes, or mixed case. We normalize to a canonical form before
 * hashing so lookups are robust, and derive a non-identifying "last 4" for the
 * owner's UI. The raw normalized value is only ever hashed or encrypted, never
 * stored in plaintext.
 *
 * ISO 11784/11785 chips are 15 digits; older AVID/HomeAgain formats vary and can
 * be alphanumeric, so we accept 9–15 alphanumeric characters.
 */
export function normalizeChip(raw: string): string {
  return raw
    .trim()
    .replace(/[\s\-._]/g, '')
    .toUpperCase();
}

const CHIP_PATTERN = /^[A-Z0-9]{9,15}$/;

export function isValidChip(normalized: string): boolean {
  return CHIP_PATTERN.test(normalized);
}

export function chipLast4(normalized: string): string {
  return normalized.slice(-4);
}

export interface ChipInput {
  normalized: string;
  last4: string;
}

/** Normalize + validate; returns null if the value can't be a chip number. */
export function parseChip(raw: string): ChipInput | null {
  const normalized = normalizeChip(raw);
  if (!isValidChip(normalized)) return null;
  return { normalized, last4: chipLast4(normalized) };
}
