/**
 * Shapes of the encrypted payloads and the associated-data (AAD) strings that
 * bind each ciphertext to its owning record, purpose, and schema version.
 *
 * The AAD is authenticated but not encrypted: on decrypt it must match exactly,
 * so a ciphertext copied into a different row (or a different field) fails to
 * open. Bumping the trailing version (`:v1`) is how a future migration signals a
 * changed payload shape.
 */

export interface OwnerPii {
  email: string;
  displayName?: string;
  phone?: string;
  address?: string;
}

export interface ContactPii {
  name: string;
  phone?: string;
  email?: string;
}

export interface FinderRelay {
  finderName?: string;
  contact?: string;
  message?: string;
  foundLocation?: string;
}

export const ownerPiiAad = (ownerId: string): string => `owner:${ownerId}:pii:v1`;
export const contactPiiAad = (contactId: string): string => `contact:${contactId}:pii:v1`;
export const chipNumberAad = (chipId: string): string => `chip:${chipId}:number:v1`;
export const finderRelayAad = (eventId: string): string => `lookup:${eventId}:finder:v1`;
