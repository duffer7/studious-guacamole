import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DB, type Database } from '@db/db.provider';
import { users, type NewUserRow, type UserRow } from '@db/schema';
import type { PublicUser } from '@modules/user/dto/response-user.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findAll(): Promise<PublicUser[]> {
    return this.db.query.users.findMany({
      columns: { password: false },
      orderBy: (users, { asc }) => [asc(users.id)],
    });
  }

  async findById(id: number): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async findByUsername(username: string): Promise<UserRow | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.username, username),
    });
  }

  async setMfa(userId: number, mfaEnabled: boolean, mfaSecret: string | null): Promise<UserRow> {
    const [updated] = await this.db
      .update(users)
      .set({ mfaEnabled, mfaSecret })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async create(input: NewUserRow): Promise<UserRow> {
    const password = await bcrypt.hash(input.password, 10);
    const [created] = await this.db
      .insert(users)
      .values({ ...input, password })
      .returning();
    return created;
  }
}
