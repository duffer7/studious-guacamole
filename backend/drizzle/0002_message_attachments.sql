ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_key" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_name" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_mime" varchar(128);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "attachment_size" integer;
