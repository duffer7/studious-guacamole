import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  boolean,
  integer,
  uniqueIndex,
  index,
  pgEnum,
  bigint,
  bigserial,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Application schema. Drizzle reads this file both at runtime (for typed
 * queries) and at migration time (`drizzle-kit`).
 *
 * Keep column names in `snake_case` (Postgres convention) and map them to the
 * `camelCase` property names the app uses.
 */
export const users = pgTable(
  'user',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).unique(),
    username: varchar('username', { length: 64 }).notNull().unique(),
    password: text('password').notNull(),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    mfaEnabled: boolean('mfa_enabled').notNull().default(false),
    mfaSecret: text('mfa_secret'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('users_id_idx').on(t.id),
    index('users_username_idx').on(t.username),
    index('users_displayName_idx').on(t.displayName),
    index('users_email_idx').on(t.email),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export const friendshipStatusEnum = pgEnum('friendship_status', [
  'pending',
  'accepted',
  'declined',
  'blocked',
]);

export const friends = pgTable(
  'friends',
  {
    requesterId: integer('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: integer('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: friendshipStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('friends_pair_unique').on(t.requesterId, t.addresseeId),
    index('friends_requester_idx').on(t.requesterId),
    index('friends_addressee_idx').on(t.addresseeId),
  ],
);

export type FriendRow = typeof friends.$inferSelect;
export type NewFriendRow = typeof friends.$inferInsert;

export const chatTypeEnum = pgEnum('chat_type', ['direct', 'group', 'channel']);

export const chats = pgTable('chats', {
  id: serial('id').primaryKey(),
  type: chatTypeEnum('type').notNull(),
  title: text('title'),
  directKey: text('direct_key').unique(),
  createdBy: integer('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
});

export type ChatRow = typeof chats.$inferSelect;
export type NewChatRow = typeof chats.$inferInsert;

export const chatMembers = pgTable(
  'chat_members',
  {
    chatId: integer('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 16 }).notNull().default('member'),
    lastReadMessageId: bigint('last_read_message_id', { mode: 'number' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('chat_members_pk').on(t.chatId, t.userId),
    index('chat_members_user_idx').on(t.userId),
  ],
);

export type ChatMemberRow = typeof chatMembers.$inferSelect;
export type NewChatMemberRow = typeof chatMembers.$inferInsert;
export type ChatMemberWithСhats = ChatMemberRow & {
  chats: ChatRow[];
};

export const messages = pgTable(
  'messages',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    chatId: integer('chat_id')
      .notNull()
      .references(() => chats.id, { onDelete: 'cascade' }),
    senderId: integer('sender_id')
      .notNull()
      .references(() => users.id),
    body: text('body'),
    type: varchar('type', { length: 16 }).notNull().default('text'),
    replyToId: bigint('reply_to_id', { mode: 'number' }),
    clientMessageId: uuid('client_message_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('messages_client_id_uniq').on(t.senderId, t.clientMessageId),
    index('messages_chat_cursor_idx').on(t.chatId, t.id),
  ],
);

export type MessageRow = typeof messages.$inferSelect;
export type NewMessageRow = typeof messages.$inferInsert;
