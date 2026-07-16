import { getConfig } from '@/config/env';
import { aesGcmAead } from './aead';
import { createEnvKeyring } from './keyring';
import { createEnvelopeCipher, type EnvelopeCipher } from './envelope';
import { createBlindIndex, type BlindIndex } from './blindIndex';

/**
 * Composition root for cryptography. Everything above this layer asks for a
 * ready-to-use cipher / blind index and never touches keys directly.
 */

let cipher: EnvelopeCipher | undefined;
let chipIndex: BlindIndex | undefined;
let emailIndex: BlindIndex | undefined;

function pepper(): Buffer {
  const { indexKey } = getConfig().crypto;
  if (!indexKey) {
    throw new Error('OPR_INDEX_KEY is not configured (run `npm run keygen`).');
  }
  const buf = Buffer.from(indexKey, 'base64');
  if (buf.length < 32) {
    throw new Error('OPR_INDEX_KEY must decode to at least 32 bytes.');
  }
  return buf;
}

export function getEnvelopeCipher(): EnvelopeCipher {
  if (!cipher) {
    const cfg = getConfig();
    const keyring = createEnvKeyring({
      activeKekId: cfg.crypto.activeKekId,
      keks: cfg.crypto.keks,
    });
    cipher = createEnvelopeCipher(aesGcmAead, keyring);
  }
  return cipher;
}

/** Blind index for microchip numbers (the hot, enumeration-resistant lookup key). */
export function getChipIndex(): BlindIndex {
  chipIndex ??= createBlindIndex(pepper(), 'chip');
  return chipIndex;
}

/** Blind index for owner emails (used for account lookup at login/signup). */
export function getEmailIndex(): BlindIndex {
  emailIndex ??= createBlindIndex(pepper(), 'email');
  return emailIndex;
}

/** Test helper: drop cached crypto singletons after changing the environment. */
export function resetCryptoCache(): void {
  cipher = undefined;
  chipIndex = undefined;
  emailIndex = undefined;
}

export type { EnvelopeCipher, EnvelopeField } from './envelope';
export { sealJson, openJson } from './envelope';
export type { BlindIndex } from './blindIndex';
export type { Keyring, KekId } from './keyring';
