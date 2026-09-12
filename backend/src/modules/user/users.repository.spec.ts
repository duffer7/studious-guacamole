import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersRepository } from '@modules/user/users.repository';
import type { Database } from '@db/db.provider';

function createDbMock(): Database {
  return {
    query: { users: { findFirst: vi.fn(), findMany: vi.fn() } },
    insert: vi.fn(),
    update: vi.fn(),
  } as unknown as Database;
}

describe('UsersRepository', () => {
  let db: ReturnType<typeof createDbMock>;
  let repo: UsersRepository;

  beforeEach(() => {
    db = createDbMock();
    repo = new UsersRepository(db);
  });

  it('findById возвращает пользователя по id', async () => {
    const user = { id: 1, username: 'artemii' };
    vi.mocked(db.query.users.findFirst).mockResolvedValue(user as never);

    const result = await repo.findById(1);

    expect(result).toBe(user);
    expect(db.query.users.findFirst).toHaveBeenCalledOnce();
  });

  // ...
});
