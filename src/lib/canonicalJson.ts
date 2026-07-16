/**
 * Deterministic JSON serialization with recursively sorted object keys.
 *
 * Determinism matters in two places:
 *  - encryption: the plaintext we seal must round-trip identically regardless of
 *    property insertion order;
 *  - the audit-log hash chain: each row's hash is computed over a canonical
 *    encoding so the chain is reproducible and verifiable by any operator.
 */
export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const v = (value as Record<string, unknown>)[key];
    if (v !== undefined) {
      sorted[key] = canonicalize(v);
    }
  }
  return sorted;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(canonicalJson(value), 'utf8');
}
