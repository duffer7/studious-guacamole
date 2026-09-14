import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { NewUserRow, UserRow } from '@db/schema';
import { UsersRepository } from '@modules/user/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}
  findById(id: number): Promise<UserRow | undefined> {
    return this.repo.findById(id);
  }

  findByUsername(username: string): Promise<UserRow | undefined> {
    return this.repo.findByUsername(username);
  }

  setMfa(userId: number, mfaEnabled: boolean, mfaSecret: string | null): Promise<UserRow> {
    return this.repo.updateMfa(userId, mfaEnabled, mfaSecret);
  }

  async create(input: NewUserRow): Promise<UserRow> {
    const password = await bcrypt.hash(input.password, 10);
    return this.repo.insert({ ...input, password });
  }
}
