import { Injectable } from '@nestjs/common';
import type { NewUserRow, UserRow } from '@db/schema';
import { UsersRepository } from '@modules/user/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}
  findById(id: number): Promise<UserRow | undefined> {
    return this.usersRepository.findById(id);
  }

  findByUsername(username: string): Promise<UserRow | undefined> {
    return this.usersRepository.findByUsername(username);
  }

  findByUsernameOrEmail(username: string, email: string): Promise<UserRow | undefined> {
    return this.usersRepository.findByUsernameOrEmail(username, email);
  }

  search(query: string, excludeUserId: number): Promise<UserRow[]> {
    return this.usersRepository.search(query, excludeUserId);
  }

  setMfa(userId: number, mfaEnabled: boolean, mfaSecret: string | null): Promise<UserRow> {
    return this.usersRepository.updateMfa(userId, mfaEnabled, mfaSecret);
  }

  create(input: NewUserRow): Promise<UserRow> {
    return this.usersRepository.insert(input);
  }
}
