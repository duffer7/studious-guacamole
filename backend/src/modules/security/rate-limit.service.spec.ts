import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimitService } from '@modules/security/rate-limit.service';
import type { RedisClient } from '@/redis/redis.provider';

/** Минимальный мок ioredis — только методы, которые использует сервис. */
function createRedisMock() {
  return {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  } as unknown as RedisClient & {
    incr: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    ttl: ReturnType<typeof vi.fn>;
  };
}

describe('RateLimitService', () => {
  let redis: ReturnType<typeof createRedisMock>;
  let service: RateLimitService;

  beforeEach(() => {
    redis = createRedisMock();
    service = new RateLimitService(redis);
  });

  describe('hit', () => {
    it('разрешает запрос в пределах лимита и ставит TTL на первом инкременте', async () => {
      redis.incr.mockResolvedValue(1);
      redis.ttl.mockResolvedValue(60);

      const result = await service.hit('rl:login:ip:1.2.3.4', 5, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.retryAfterSeconds).toBe(0);
      expect(redis.expire).toHaveBeenCalledWith('rl:login:ip:1.2.3.4', 60, 'NX');
    });

    it('не переустанавливает TTL на последующих инкрементах', async () => {
      redis.incr.mockResolvedValue(2);
      redis.ttl.mockResolvedValue(55);

      await service.hit('rl:login:ip:1.2.3.4', 5, 60);

      expect(redis.expire).not.toHaveBeenCalled();
    });

    it('блокирует запрос при превышении лимита и отдаёт retryAfter', async () => {
      redis.incr.mockResolvedValue(6);
      redis.ttl.mockResolvedValue(42);

      const result = await service.hit('rl:login:ip:1.2.3.4', 5, 60);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterSeconds).toBe(42);
    });

    it('fail-open: при ошибке Redis разрешает запрос', async () => {
      redis.incr.mockRejectedValue(new Error('redis down'));

      const result = await service.hit('rl:login:ip:1.2.3.4', 5, 60);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(5);
    });
  });

  describe('lockedFor', () => {
    it('возвращает TTL, если ключ есть', async () => {
      redis.ttl.mockResolvedValue(30);
      expect(await service.lockedFor('lock:user')).toBe(30);
    });

    it('возвращает 0, если ключа нет (ttl = -2)', async () => {
      redis.ttl.mockResolvedValue(-2);
      expect(await service.lockedFor('lock:user')).toBe(0);
    });

    it('fail-open: при ошибке возвращает 0', async () => {
      redis.ttl.mockRejectedValue(new Error('redis down'));
      expect(await service.lockedFor('lock:user')).toBe(0);
    });
  });
});
