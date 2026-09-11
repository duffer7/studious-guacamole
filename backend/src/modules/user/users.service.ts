import { Inject, Injectable } from '@nestjs/common';
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

  async create(input: NewUserRow): Promise<UserRow> {
    const [created] = await this.db.insert(users).values(input).returning();
    return created;
  }
}
