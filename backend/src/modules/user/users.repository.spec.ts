import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersRepository } from '@modules/user/users.repository';
import type { Database } from '@db/db.provider';
import { users, type UserRow } from '@db/schema';

describe('UsersRepository', () => {
  let findFirst: ReturnType<typeof vi.fn>;

  let insert: ReturnType<typeof vi.fn>;
  let insertValues: ReturnType<typeof vi.fn>;
  let insertReturning: ReturnType<typeof vi.fn>;

  let update: ReturnType<typeof vi.fn>;
  let updateSet: ReturnType<typeof vi.fn>;
  let updateWhere: ReturnType<typeof vi.fn>;
  let updateReturning: ReturnType<typeof vi.fn>;

  let repo: UsersRepository;

  beforeEach(() => {
    findFirst = vi.fn();

    // insert(users).values(input).returning()
    insertReturning = vi.fn().mockResolvedValue([]);
    insertValues = vi.fn().mockReturnValue({ returning: insertReturning });
    insert = vi.fn().mockReturnValue({ values: insertValues });

    // update(users).set(...).where(...).returning()
    updateReturning = vi.fn().mockResolvedValue([]);
    updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    updateSet = vi.fn().mockReturnValue({ where: updateWhere });
    update = vi.fn().mockReturnValue({ set: updateSet });

    const db = {
      query: { users: { findFirst } },
      insert,
      update,
    } as unknown as Database;
    repo = new UsersRepository(db);
  });

  describe('findById', () => {
    it('возвращает пользователя по id', async () => {
      const user = { id: 1, username: 'artemii' } as UserRow;
      findFirst.mockResolvedValue(user);

      const result = await repo.findById(1);

      expect(result).toBe(user);
      expect(findFirst).toHaveBeenCalledOnce();
    });

    it('возвращает undefined, если пользователя нет', async () => {
      findFirst.mockResolvedValue(undefined);

      const result = await repo.findById(1);

      expect(result).toBeUndefined();
      expect(findFirst).toHaveBeenCalledOnce();
    });
  });

  describe('findByUsername', () => {
    it('возвращает пользователя по username', async () => {
      const user = { id: 1, username: 'artemii' } as UserRow;
      findFirst.mockResolvedValue(user);

      const result = await repo.findByUsername('artemii');

      expect(result).toBe(user);
      expect(findFirst).toHaveBeenCalledOnce();
    });

    it('возвращает undefined, если по username ничего не нашли', async () => {
      findFirst.mockResolvedValue(undefined);

      const result = await repo.findByUsername('test');
      expect(result).toBeUndefined();
      expect(findFirst).toHaveBeenCalledOnce();
    });
  });

  describe('insert', () => {
    it('хеширует пароль, вставляет данные и разворачивает возвращённый массив', async () => {
      const input = { username: 'artemii', password: '1234', email: 'example@example.com' };
      const created = { id: 1, ...input } as UserRow;
      insertReturning.mockResolvedValue([created]);
      const result = await repo.insert(input as never);

      expect(insert).toHaveBeenCalledWith(users);
      expect(insert).toHaveBeenCalledOnce();

      // пароль не должен сохраняться в открытом виде
      const inserted = insertValues.mock.calls[0][0] as {
        password: string;
        username: string;
        email: string;
      };
      expect(inserted.password).not.toBe(input.password);
      expect(inserted.password).toMatch(/^\$2[aby]\$/);
      // прочие поля не изменяются
      expect(inserted.username).toBe(input.username);
      expect(inserted.email).toBe(input.email);
      expect(result).toBe(created);
    });
  });

  describe('updateMfa', () => {
    it('обновляет флаги mfa и возвращает обновлённого пользователя', async () => {
      const updated = { id: 1, mfaEnabled: true, mfaSecret: '123456' } as UserRow;
      updateReturning.mockResolvedValue([updated]);

      const result = await repo.updateMfa(1, true, '123456');

      expect(update).toHaveBeenCalledWith(users);
      expect(update).toHaveBeenCalledOnce();
      expect(updateSet).toHaveBeenCalledWith({ mfaEnabled: true, mfaSecret: '123456' });
      expect(result).toBe(updated);
    });
  });
});
