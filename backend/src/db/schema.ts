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
} from 'drizzle-orm/pg-core';

/**
 * Application schema. Drizzle reads this file both at runtime (for typed
 * queries) and at migration time (`drizzle-kit`).
 *
 * Keep column names in `snake_case` (Postgres convention) and map them to the
 * `camelCase` property names the app uses.
 */
export const users = pgTable('user', {
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
});

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
  (t) => ({
    userPair: uniqueIndex('friends_pair_unique').on(t.requesterId, t.addresseeId),
    user1Idx: index('friends_requester_idx').on(t.requesterId),
    user2Idx: index('friends_addressee_idx').on(t.addresseeId),
  }),
);

export type FriendRow = typeof friends.$inferSelect;
export type NewFriendRow = typeof friends.$inferInsert;
