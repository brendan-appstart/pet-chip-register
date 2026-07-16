/**
 * A keyring sources key-encryption-keys (KEKs) that wrap per-record data keys.
 *
 * KEKs are NEVER stored in the database and NEVER logged. In this MVP they come
 * from the environment (`OPR_KEK_<id>`), but `getKek` is async so a future
 * implementation can assemble a Shamir-split key or fetch from an external KMS
 * or HSM without changing any caller. Retired KEK ids remain available so that
 * `rewrap` can migrate old records to the active key.
 */
export type KekId = string;

export interface Keyring {
  activeKekId(): KekId;
  getKek(id: KekId): Promise<Buffer>;
  listKekIds(): KekId[];
}

const KEY_LENGTH = 32;

function decodeKey(id: KekId, base64: string): Buffer {
  let key: Buffer;
  try {
    key = Buffer.from(base64, 'base64');
  } catch {
    throw new Error(`KEK "${id}" is not valid base64`);
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error(`KEK "${id}" must decode to ${KEY_LENGTH} bytes, got ${key.length}`);
  }
  return key;
}

/**
 * Keyring backed by base64-encoded keys held in memory (loaded from env config).
 */
export function createEnvKeyring(params: {
  activeKekId: KekId;
  keks: Record<KekId, string>;
}): Keyring {
  const { activeKekId, keks } = params;

  return {
    activeKekId: () => activeKekId,
    listKekIds: () => Object.keys(keks),
    async getKek(id) {
      const base64 = keks[id];
      if (!base64) {
        throw new Error(
          `KEK "${id}" is not configured. Set OPR_KEK_${id} (run \`npm run keygen\`).`,
        );
      }
      return decodeKey(id, base64);
    },
  };
}
