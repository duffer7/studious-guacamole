import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TokenStoreService } from './token-store.service';
import type { RedisClient } from '@/redis/redis.provider';

/** Пайплайн-мок: собирает вызовы, `exec` резолвится. */
function createPipelineMock() {
  const calls: unknown[][] = [];
  const pipeline = {
    set: vi.fn((...args: unknown[]) => {
      calls.push(['set', ...args]);
      return pipeline;
    }),
    del: vi.fn((...args: unknown[]) => {
      calls.push(['del', ...args]);
      return pipeline;
    }),
    sadd: vi.fn((...args: unknown[]) => {
      calls.push(['sadd', ...args]);
      return pipeline;
    }),
    expire: vi.fn((...args: unknown[]) => {
      calls.push(['expire', ...args]);
      return pipeline;
    }),
    exec: vi.fn(() => Promise.resolve(calls)),
  };
  return { pipeline, calls };
}

function createRedisMock() {
  const { pipeline } = createPipelineMock();
  return {
    pipeline: vi.fn(() => pipeline),
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    mget: vi.fn(),
    smembers: vi.fn(),
  } as unknown as RedisClient & {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    mget: ReturnType<typeof vi.fn>;
    smembers: ReturnType<typeof vi.fn>;
    pipeline: ReturnType<typeof vi.fn>;
  };
}

describe('TokenStoreService', () => {
  let redis: ReturnType<typeof createRedisMock>;
  let service: TokenStoreService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    redis = createRedisMock();
    service = new TokenStoreService(redis);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** TTL = exp - now (в секундах). now = 1767225600. */
  const nowSec = Math.floor(new Date('2026-01-01T00:00:00.000Z').getTime() / 1000);

  describe('revokeSession', () => {
    it('через pipeline ставит отзыв сессии и удаляет запись refresh с корректным TTL', async () => {
      const { pipeline } = createPipelineMock();
      redis.pipeline.mockReturnValue(pipeline);

      await service.revokeSession('sid-1', nowSec + 100);

      expect(pipeline.set).toHaveBeenCalledWith('revoked:sid:sid-1', '1', 'EX', 100);
      expect(pipeline.del).toHaveBeenCalledWith('refresh:sid-1');
      expect(pipeline.exec).toHaveBeenCalled();
    });

    it('ничего не делает, если токен уже истёк (ttl <= 0)', async () => {
      await service.revokeSession('sid-1', nowSec - 10);
      expect(redis.pipeline).not.toHaveBeenCalled();
    });
  });

  describe('registerRefresh', () => {
    it('сохраняет текущий jti с TTL', async () => {
      await service.registerRefresh('sid-1', 'jti-1', nowSec + 500);
      expect(redis.set).toHaveBeenCalledWith('refresh:sid-1', 'jti-1', 'EX', 500);
    });
  });

  describe('consumeRefresh', () => {
    it("'unknown', если записи нет", async () => {
      redis.get.mockResolvedValue(null);
      expect(await service.consumeRefresh('sid-1', 'jti-1')).toBe('unknown');
    });

    it("'reused', если пришёл не текущий jti (признак кражи)", async () => {
      redis.get.mockResolvedValue('jti-current');
      expect(await service.consumeRefresh('sid-1', 'jti-old')).toBe('reused');
      expect(redis.del).not.toHaveBeenCalled();
    });

    it("'ok' и сжигает запись, если jti совпал", async () => {
      redis.get.mockResolvedValue('jti-1');
      expect(await service.consumeRefresh('sid-1', 'jti-1')).toBe('ok');
      expect(redis.del).toHaveBeenCalledWith('refresh:sid-1');
    });
  });

  describe('isRevoked', () => {
    it('true, если отозван jti', async () => {
      redis.mget.mockResolvedValue(['1', null]);
      expect(await service.isRevoked('jti-1', 'sid-1')).toBe(true);
    });

    it('true, если отозвана сессия', async () => {
      redis.mget.mockResolvedValue([null, '1']);
      expect(await service.isRevoked('jti-1', 'sid-1')).toBe(true);
    });

    it('false, если ничего не отозвано', async () => {
      redis.mget.mockResolvedValue([null, null]);
      expect(await service.isRevoked('jti-1', 'sid-1')).toBe(false);
    });
  });

  describe('revokeAllUserSessions', () => {
    it('отзывает все sid пользователя и очищает set', async () => {
      const { pipeline } = createPipelineMock();
      redis.pipeline.mockReturnValue(pipeline);
      redis.smembers.mockResolvedValue(['sid-1', 'sid-2']);

      await service.revokeAllUserSessions(7);

      expect(redis.smembers).toHaveBeenCalledWith('user:sessions:7');
      expect(pipeline.set).toHaveBeenCalledWith('revoked:sid:sid-1', '1', 'EX', 604800);
      expect(pipeline.set).toHaveBeenCalledWith('revoked:sid:sid-2', '1', 'EX', 604800);
      expect(pipeline.del).toHaveBeenCalledWith('user:sessions:7');
    });
  });
});
