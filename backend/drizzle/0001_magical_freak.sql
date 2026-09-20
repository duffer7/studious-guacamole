CREATE TYPE "public"."chat_type" AS ENUM('direct', 'group', 'channel');--> statement-breakpoint
CREATE TABLE "chat_members" (
	"chat_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(16) DEFAULT 'member' NOT NULL,
	"last_read_message_id" bigint,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "chat_type" NOT NULL,
	"title" text,
	"direct_key" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone,
	CONSTRAINT "chats_direct_key_unique" UNIQUE("direct_key")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"chat_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"body" text,
	"type" varchar(16) DEFAULT 'text' NOT NULL,
	"reply_to_id" bigint,
	"client_message_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_members" ADD CONSTRAINT "chat_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chats" ADD CONSTRAINT "chats_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_id_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "chat_members_pk" ON "chat_members" USING btree ("chat_id","user_id");--> statement-breakpoint
CREATE INDEX "chat_members_user_idx" ON "chat_members" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "messages_client_id_uniq" ON "messages" USING btree ("sender_id","client_message_id");--> statement-breakpoint
CREATE INDEX "messages_chat_cursor_idx" ON "messages" USING btree ("chat_id","id");--> statement-breakpoint
CREATE INDEX "users_id_idx" ON "user" USING btree ("id");--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "user" USING btree ("username");--> statement-breakpoint
CREATE INDEX "users_displayName_idx" ON "user" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "user" USING btree ("email");