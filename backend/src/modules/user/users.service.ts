import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { NewUserRow, UserRow } from '@db/schema';
import type { PublicUser } from '@modules/user/dto/response-user.dto';
import { UsersRepository } from '@modules/user/users.repository';

/**
 * Бизнес-логика над пользователями. Доступ к БД делегирован
 * `UsersRepository`, а здесь остаются правила уровня приложения
 * (например, хеширование пароля перед сохранением).
 */
@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}
  findAll(): Promise<PublicUser[]> {
    return this.repo.findAllPublic();
  }

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
