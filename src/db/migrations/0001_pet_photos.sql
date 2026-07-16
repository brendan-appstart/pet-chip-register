CREATE TABLE `pet_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`pet_id` text NOT NULL,
	`storage_key` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`pet_id`) REFERENCES `pets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `pet_photos_pet_id_idx` ON `pet_photos` (`pet_id`);