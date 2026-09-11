import { pgTable, serial, text, timestamp, varchar, boolean } from 'drizzle-orm/pg-core';

/**
 * Application schema. Drizzle reads this file both at runtime (for typed
 * queries) and at migration time (`drizzle-kit`).
 *
 * Keep column names in `snake_case` (Postgres convention) and map them to the
 * `camelCase` property names the app uses.
 */
export const users = pgTable('user', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
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
