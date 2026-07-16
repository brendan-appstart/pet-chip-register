CREATE TABLE `audit_chain_head` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`head_hash` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`occurred_at` integer NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`ip_hash` text,
	`metadata_json` text,
	`prev_hash` text NOT NULL,
	`row_hash` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_occurred_at_idx` ON `audit_log` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_log_actor_idx` ON `audit_log` (`actor_id`);--> statement-breakpoint
CREATE TABLE `emergency_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`label` text,
	`pii_ciphertext` blob NOT NULL,
	`pii_nonce` blob NOT NULL,
	`pii_wrapped_dek` blob NOT NULL,
	`pii_kek_id` text NOT NULL,
	`pii_alg` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `emergency_contacts_pet_id_idx` ON `emergency_contacts` (`pet_id`);--> statement-breakpoint
CREATE TABLE `lookup_events` (
	`id` text PRIMARY KEY NOT NULL,
	`chip_number_hash` text NOT NULL,
	`matched_pet_id` text,
	`outcome` text NOT NULL,
	`finder_ciphertext` blob,
	`finder_nonce` blob,
	`finder_wrapped_dek` blob,
	`finder_kek_id` text,
	`finder_alg` text,
	`request_ip_hash` text,
	`request_fingerprint` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`matched_pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `lookup_events_chip_number_hash_idx` ON `lookup_events` (`chip_number_hash`);--> statement-breakpoint
CREATE INDEX `lookup_events_ip_time_idx` ON `lookup_events` (`request_ip_hash`,`created_at`);--> statement-breakpoint
CREATE TABLE `lost_mode_status` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`is_lost` integer DEFAULT false NOT NULL,
	`lost_since` integer,
	`found_at` integer,
	`last_seen_location` text,
	`reward` text,
	`public_message` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lost_mode_status_pet_id_unique` ON `lost_mode_status` (`pet_id`);--> statement-breakpoint
CREATE INDEX `lost_mode_status_is_lost_idx` ON `lost_mode_status` (`is_lost`);--> statement-breakpoint
CREATE TABLE `magic_link_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`email_lookup_hash` text NOT NULL,
	`token_hash` text NOT NULL,
	`purpose` text NOT NULL,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`request_ip_hash` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `magic_link_tokens_token_hash_idx` ON `magic_link_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `magic_link_tokens_email_idx` ON `magic_link_tokens` (`email_lookup_hash`);--> statement-breakpoint
CREATE INDEX `magic_link_tokens_expires_idx` ON `magic_link_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `microchips` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`chip_number_hash` text NOT NULL,
	`chip_last4` text NOT NULL,
	`chip_ciphertext` blob NOT NULL,
	`chip_nonce` blob NOT NULL,
	`chip_wrapped_dek` blob NOT NULL,
	`chip_kek_id` text NOT NULL,
	`chip_alg` text NOT NULL,
	`brand` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `microchips_chip_number_hash_unique` ON `microchips` (`chip_number_hash`);--> statement-breakpoint
CREATE INDEX `microchips_pet_id_idx` ON `microchips` (`pet_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`pet_id` text,
	`channel` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`provider` text,
	`provider_message_id` text,
	`error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_owner_id_idx` ON `notifications` (`owner_id`);--> statement-breakpoint
CREATE INDEX `notifications_status_idx` ON `notifications` (`status`);--> statement-breakpoint
CREATE TABLE `owner_pet_links` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`pet_id` text NOT NULL,
	`role` text DEFAULT 'owner' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owner_pet_links_owner_pet_idx` ON `owner_pet_links` (`owner_id`,`pet_id`);--> statement-breakpoint
CREATE INDEX `owner_pet_links_pet_id_idx` ON `owner_pet_links` (`pet_id`);--> statement-breakpoint
CREATE INDEX `owner_pet_links_owner_id_idx` ON `owner_pet_links` (`owner_id`);--> statement-breakpoint
CREATE TABLE `owners` (
	`id` text PRIMARY KEY NOT NULL,
	`email_lookup_hash` text NOT NULL,
	`email_last_domain` text,
	`pii_ciphertext` blob NOT NULL,
	`pii_nonce` blob NOT NULL,
	`pii_wrapped_dek` blob NOT NULL,
	`pii_kek_id` text NOT NULL,
	`pii_alg` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `owners_email_lookup_hash_unique` ON `owners` (`email_lookup_hash`);--> statement-breakpoint
CREATE TABLE `pets` (
	`id` text PRIMARY KEY NOT NULL,
	`public_token` text NOT NULL,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`breed` text,
	`color` text,
	`sex` text,
	`description` text,
	`photo_storage_key` text,
	`primary_owner_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`primary_owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pets_public_token_unique` ON `pets` (`public_token`);--> statement-breakpoint
CREATE INDEX `pets_primary_owner_id_idx` ON `pets` (`primary_owner_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_token_hash` text NOT NULL,
	`owner_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`revoked_at` integer,
	`user_agent_hash` text,
	`ip_hash` text,
	FOREIGN KEY (`owner_id`) REFERENCES `owners`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_session_token_hash_unique` ON `sessions` (`session_token_hash`);--> statement-breakpoint
CREATE INDEX `sessions_owner_id_idx` ON `sessions` (`owner_id`);