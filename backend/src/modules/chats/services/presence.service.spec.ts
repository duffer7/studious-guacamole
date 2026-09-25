import { describe, expect, it, vi } from 'vitest';
import { PresenceService } from '@modules/chats/services/presence.service';

function redisMock() {
  const sets = new Map<string, Set<string>>();
  const keys = new Map<string, string>();
  const pipeline = {
    set: vi.fn((key: string, value: string) => {
      keys.set(key, value);
      return pipeline;
    }),
    sadd: vi.fn((key: string, member: string) => {
      const set = sets.get(key) ?? new Set<string>();
      set.add(member);
      sets.set(key, set);
      return pipeline;
    }),
    expire: vi.fn(() => pipeline),
    exists: vi.fn((key: string) => {
      pipeline.queued.push(keys.has(key) ? 1 : 0);
      return pipeline;
    }),
    queued: [] as number[],
    exec: vi.fn(async () => {
      const rows = pipeline.queued.map((value) => [null, value] as [null, number]);
      pipeline.queued = [];
      return rows;
    }),
  };

  return {
    pipeline: vi.fn(() => pipeline),
    srem: vi.fn(async (key: string, member: string) => {
      sets.get(key)?.delete(member);
    }),
    scard: vi.fn(async (key: string) => sets.get(key)?.size ?? 0),
    del: vi.fn(async (key: string) => {
      keys.delete(key);
    }),
    sets,
    keys,
  };
}

describe('PresenceService', () => {
  it('остаётся онлайн, пока жив хотя бы один сокет', async () => {
    const redis = redisMock();
    const service = new PresenceService(redis as never);

    await service.markOnline(1, 'sock-a');
    await service.markOnline(1, 'sock-b');

    expect(await service.markOffline(1, 'sock-a')).toBe(true);
    expect(redis.keys.has('presence:1')).toBe(true);
  });

  it('снимает онлайн, когда уходит последний сокет', async () => {
    const redis = redisMock();
    const service = new PresenceService(redis as never);

    await service.markOnline(1, 'sock-a');

    expect(await service.markOffline(1, 'sock-a')).toBe(false);
    expect(redis.keys.has('presence:1')).toBe(false);
  });

  it('читает онлайн пачкой и деградирует при ошибке Redis', async () => {
    const redis = redisMock();
    const service = new PresenceService(redis as never);
    await service.markOnline(2, 'sock-a');

    const online = await service.isOnlineMany([2, 3]);
    expect(online.get(2)).toBe(true);
    expect(online.get(3)).toBe(false);

    redis.pipeline.mockImplementation(() => {
      throw new Error('redis down');
    });
    const unknown = await service.isOnlineMany([2]);
    expect(unknown.get(2)).toBeNull();

    redis.srem.mockRejectedValue(new Error('redis down'));
    expect(await service.markOffline(2, 'sock-a')).toBe(true);
  });
});
