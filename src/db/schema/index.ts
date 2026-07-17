import { sql } from 'drizzle-orm';
import { blob, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * Database schema.
 *
 * Portability rules (so a Postgres swap stays mechanical):
 *  - text ULID primary keys, never autoincrement;
 *  - integer epoch-millisecond timestamps, never SQLite date functions;
 *  - blob for ciphertext, integer 0/1 (mode:boolean) for flags;
 *  - no SQLite JSON1 functions in queries — JSON is (de)serialized in app code.
 *
 * Encrypted PII lives in an "envelope" column group produced by `enc()` /
 * `encNullable()`: ciphertext + nonce + wrapped DEK + KEK id + algorithm. The
 * plaintext of these fields never touches the database.
 */

// Reusable required envelope columns for a single encrypted field group.
function enc(prefix: string) {
  return {
    ciphertext: blob(`${prefix}_ciphertext`, { mode: 'buffer' }).notNull(),
    nonce: blob(`${prefix}_nonce`, { mode: 'buffer' }).notNull(),
    wrappedDek: blob(`${prefix}_wrapped_dek`, { mode: 'buffer' }).notNull(),
    kekId: text(`${prefix}_kek_id`).notNull(),
    alg: text(`${prefix}_alg`).notNull(),
  };
}

// Nullable variant, for envelopes that may be absent (e.g. an anonymous finder).
function encNullable(prefix: string) {
  return {
    ciphertext: blob(`${prefix}_ciphertext`, { mode: 'buffer' }),
    nonce: blob(`${prefix}_nonce`, { mode: 'buffer' }),
    wrappedDek: blob(`${prefix}_wrapped_dek`, { mode: 'buffer' }),
    kekId: text(`${prefix}_kek_id`),
    alg: text(`${prefix}_alg`),
  };
}

const createdAt = integer('created_at').notNull();
const updatedAt = integer('updated_at').notNull();

// --- Owners (users) ----------------------------------------------------------
export const owners = sqliteTable('owners', {
  id: text('id').primaryKey(),
  // HMAC blind index of the normalized email. Login/signup key off this — never
  // the plaintext email, which is only present inside the encrypted `pii` blob.
  emailLookupHash: text('email_lookup_hash').notNull().unique(),
  // Coarse, non-identifying domain for aggregate stats only (optional).
  emailLastDomain: text('email_last_domain'),
  ...enc('pii'), // { email, displayName, phone?, address? }
  status: text('status').notNull().default('active'), // active | disabled
  createdAt,
  updatedAt,
});

// --- Pets --------------------------------------------------------------------
export const pets = sqliteTable(
  'pets',
  {
    id: text('id').primaryKey(),
    // Random, rotatable public token used in QR codes and /p/[token] URLs.
    // Never the chip number or the internal id.
    publicToken: text('public_token').notNull().unique(),
    name: text('name').notNull(),
    species: text('species').notNull(),
    breed: text('breed'),
    color: text('color'),
    sex: text('sex'),
    description: text('description'),
    photoStorageKey: text('photo_storage_key'),
    primaryOwnerId: text('primary_owner_id')
      .notNull()
      .references(() => owners.id),
    status: text('status').notNull().default('active'), // active | archived | deceased
    createdAt,
    updatedAt,
  },
  (t) => ({
    primaryOwnerIdx: index('pets_primary_owner_id_idx').on(t.primaryOwnerId),
  }),
);

// --- Owner ↔ Pet links (multi-owner ready) -----------------------------------
export const ownerPetLinks = sqliteTable(
  'owner_pet_links',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => owners.id),
    petId: text('pet_id')
      .notNull()
      .references(() => pets.id),
    role: text('role').notNull().default('owner'), // owner | co_owner | caretaker
    createdAt,
  },
  (t) => ({
    ownerPetUnique: uniqueIndex('owner_pet_links_owner_pet_idx').on(t.ownerId, t.petId),
    petIdx: index('owner_pet_links_pet_id_idx').on(t.petId),
    ownerIdx: index('owner_pet_links_owner_id_idx').on(t.ownerId),
  }),
);

// --- Microchips --------------------------------------------------------------
export const microchips = sqliteTable(
  'microchips',
  {
    id: text('id').primaryKey(),
    petId: text('pet_id')
      .notNull()
      .references(() => pets.id),
    // THE hot lookup key: HMAC blind index of the normalized chip number. Unique
    // so a chip maps to one registration; a DB leak yields hashes, not chips.
    chipNumberHash: text('chip_number_hash').notNull().unique(),
    chipLast4: text('chip_last4').notNull(), // for owner UI only ("•••• 1234")
    ...enc('chip'), // encrypted raw chip number (owner can view; lookups never decrypt)
    brand: text('brand'),
    createdAt,
    updatedAt,
  },
  (t) => ({
    petIdx: index('microchips_pet_id_idx').on(t.petId),
  }),
);

// --- Pet photos (gallery) ----------------------------------------------------
export const petPhotos = sqliteTable(
  'pet_photos',
  {
    id: text('id').primaryKey(),
    petId: text('pet_id')
      .notNull()
      .references(() => pets.id),
    storageKey: text('storage_key').notNull(),
    createdAt,
  },
  (t) => ({
    petIdx: index('pet_photos_pet_id_idx').on(t.petId),
  }),
);

// --- Emergency contacts ------------------------------------------------------
export const emergencyContacts = sqliteTable(
  'emergency_contacts',
  {
    id: text('id').primaryKey(),
    petId: text('pet_id')
      .notNull()
      .references(() => pets.id),
    label: text('label'), // e.g. "Vet", "Neighbor" — non-identifying
    ...enc('pii'), // { name, phone?, email? }
    archivedAt: integer('archived_at'), // soft-archive; null = active
    createdAt,
    updatedAt,
  },
  (t) => ({
    petIdx: index('emergency_contacts_pet_id_idx').on(t.petId),
  }),
);

// --- Magic-link tokens -------------------------------------------------------
export const magicLinkTokens = sqliteTable(
  'magic_link_tokens',
  {
    id: text('id').primaryKey(),
    emailLookupHash: text('email_lookup_hash').notNull(),
    tokenHash: text('token_hash').notNull(), // sha256 of the raw token
    purpose: text('purpose').notNull(), // login | signup
    expiresAt: integer('expires_at').notNull(),
    consumedAt: integer('consumed_at'), // single-use marker
    requestIpHash: text('request_ip_hash'),
    createdAt,
  },
  (t) => ({
    tokenHashIdx: index('magic_link_tokens_token_hash_idx').on(t.tokenHash),
    emailIdx: index('magic_link_tokens_email_idx').on(t.emailLookupHash),
    expiresIdx: index('magic_link_tokens_expires_idx').on(t.expiresAt),
  }),
);

// --- Sessions ----------------------------------------------------------------
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    sessionTokenHash: text('session_token_hash').notNull().unique(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => owners.id),
    createdAt,
    expiresAt: integer('expires_at').notNull(),
    lastSeenAt: integer('last_seen_at').notNull(),
    revokedAt: integer('revoked_at'),
    userAgentHash: text('user_agent_hash'),
    ipHash: text('ip_hash'),
  },
  (t) => ({
    ownerIdx: index('sessions_owner_id_idx').on(t.ownerId),
  }),
);

// --- Lookup events -----------------------------------------------------------
export const lookupEvents = sqliteTable(
  'lookup_events',
  {
    id: text('id').primaryKey(),
    chipNumberHash: text('chip_number_hash').notNull(),
    matchedPetId: text('matched_pet_id').references(() => pets.id), // NEVER revealed to finder
    outcome: text('outcome').notNull(), // matched | no_match | rate_limited | challenged
    ...encNullable('finder'), // { finderName?, contact?, message?, foundLocation? }
    requestIpHash: text('request_ip_hash'),
    requestFingerprint: text('request_fingerprint'),
    createdAt,
  },
  (t) => ({
    chipHashIdx: index('lookup_events_chip_number_hash_idx').on(t.chipNumberHash),
    ipTimeIdx: index('lookup_events_ip_time_idx').on(t.requestIpHash, t.createdAt),
  }),
);

// --- Notifications -----------------------------------------------------------
export const notifications = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => owners.id),
    petId: text('pet_id').references(() => pets.id),
    channel: text('channel').notNull(), // email | sms | push
    type: text('type').notNull(), // chip_lookup_alert | magic_link | lost_mode_ack
    status: text('status').notNull().default('pending'), // pending | sent | failed
    provider: text('provider'),
    providerMessageId: text('provider_message_id'),
    error: text('error'),
    // No cleartext PII here — reference ids only.
    createdAt,
    updatedAt,
  },
  (t) => ({
    ownerIdx: index('notifications_owner_id_idx').on(t.ownerId),
    statusIdx: index('notifications_status_idx').on(t.status),
  }),
);

// --- Lost mode ---------------------------------------------------------------
export const lostModeStatus = sqliteTable(
  'lost_mode_status',
  {
    id: text('id').primaryKey(),
    petId: text('pet_id')
      .notNull()
      .unique()
      .references(() => pets.id),
    isLost: integer('is_lost', { mode: 'boolean' }).notNull().default(false),
    lostSince: integer('lost_since'),
    foundAt: integer('found_at'),
    lastSeenLocation: text('last_seen_location'), // coarse, owner opt-in
    reward: text('reward'),
    publicMessage: text('public_message'),
    updatedBy: text('updated_by').references(() => owners.id),
    createdAt,
    updatedAt,
  },
  (t) => ({
    isLostIdx: index('lost_mode_status_is_lost_idx').on(t.isLost),
  }),
);

// --- Audit log (append-only, hash-chained) -----------------------------------
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(), // ULID → monotonic ordering
    occurredAt: integer('occurred_at').notNull(),
    actorType: text('actor_type').notNull(), // owner | finder | system | admin
    actorId: text('actor_id'),
    action: text('action').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    ipHash: text('ip_hash'),
    metadataJson: text('metadata_json'), // non-PII structured context
    prevHash: text('prev_hash').notNull(),
    rowHash: text('row_hash').notNull(),
  },
  (t) => ({
    occurredIdx: index('audit_log_occurred_at_idx').on(t.occurredAt),
    entityIdx: index('audit_log_entity_idx').on(t.entityType, t.entityId),
    actorIdx: index('audit_log_actor_idx').on(t.actorId),
  }),
);

// A single-row table pinning the head of the audit hash chain, so the chain can
// be extended safely under concurrency and verified from a known anchor.
export const auditChainHead = sqliteTable('audit_chain_head', {
  id: integer('id').primaryKey().default(1),
  headHash: text('head_hash').notNull(),
  count: integer('count').notNull().default(0),
  updatedAt: integer('updated_at')
    .notNull()
    .default(sql`0`),
});

export type Owner = typeof owners.$inferSelect;
export type Pet = typeof pets.$inferSelect;
export type PetPhoto = typeof petPhotos.$inferSelect;
export type Microchip = typeof microchips.$inferSelect;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type MagicLinkToken = typeof magicLinkTokens.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type LookupEvent = typeof lookupEvents.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type LostModeStatus = typeof lostModeStatus.$inferSelect;
export type AuditLogRow = typeof auditLog.$inferSelect;
