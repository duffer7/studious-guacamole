import { Injectable } from '@nestjs/common';
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

  findByUsernameOrEmail(username: string, email: string): Promise<UserRow | undefined> {
    return this.repo.findByUsernameOrEmail(username, email);
  }

  setMfa(userId: number, mfaEnabled: boolean, mfaSecret: string | null): Promise<UserRow> {
    return this.repo.updateMfa(userId, mfaEnabled, mfaSecret);
  }

  create(input: NewUserRow): Promise<UserRow> {
    return this.repo.insert(input);
  }
}
