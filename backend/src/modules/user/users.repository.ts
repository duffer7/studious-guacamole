import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB, type Database } from '@db/db.provider';
import { users, type NewUserRow, type UserRow } from '@db/schema';

@Injectable()
export class UsersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  findById(id: number): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  findByUsername(username: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.username, username),
    });
  }

  async findAllPublic(): Promise<Omit<UserRow, 'password'>[]> {
    return this.db.query.users.findMany({
      columns: { password: false },
      orderBy: (users, { asc }) => [asc(users.id)],
    });
  }

  async insert(input: NewUserRow): Promise<UserRow> {
    const [created] = await this.db.insert(users).values(input).returning();
    return created;
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
