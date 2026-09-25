import { Inject, Injectable } from '@nestjs/common';
import { eq, ilike, inArray, or } from 'drizzle-orm';
import { DB, type Database } from '@db/db.provider';
import { users, type NewUserRow, type UserRow } from '@db/schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  findById(id: number): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async findByIds(ids: number[]): Promise<UserRow[]> {
    if (ids.length === 0) return [];
    return this.db.query.users.findMany({ where: inArray(users.id, ids) });
  }

  findByUsername(username: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.username, username),
    });
  }

  /** Поиск пользователей по username/displayName, исключая самого вызывающего. */
  async search(query: string, excludeUserId: number, limit = 20): Promise<UserRow[]> {
    const pattern = `%${query}%`;

    return this.db.query.users
      .findMany({
        where: or(ilike(users.username, pattern), ilike(users.displayName, pattern)),
        orderBy: (u, { asc }) => [asc(u.username)],
        limit,
      })
      .then((rows) => rows.filter((r) => r.id !== excludeUserId));
  }

  findByUsernameOrEmail(username?: string, email?: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({
      where: or(
        username ? eq(users.username, username) : undefined,
        email ? eq(users.email, email) : undefined,
      ),
    });
  }

  async insert(input: NewUserRow): Promise<UserRow> {
    const hashedPassword = await bcrypt.hash(input.password, 10);
    const [created] = await this.db
      .insert(users)
      .values({ ...input, password: hashedPassword })
      .returning();

    return created;
  }

  async updateProfile(
    userId: number,
    patch: { displayName?: string | null; avatarUrl?: string | null },
  ): Promise<UserRow | undefined> {
    const [updated] = await this.db
      .update(users)
      .set(patch)
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async updateLastSeen(userId: number, lastSeenAt: Date): Promise<void> {
    await this.db.update(users).set({ lastSeenAt }).where(eq(users.id, userId));
  }

  async updateMfa(userId: number, mfaEnabled: boolean, mfaSecret: string | null): Promise<UserRow> {
    const [updated] = await this.db
      .update(users)
      .set({ mfaEnabled, mfaSecret })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }
}
