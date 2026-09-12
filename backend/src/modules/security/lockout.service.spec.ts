import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LockoutService } from './lockout.service';
import type { RedisClient } from '@/redis/redis.provider';

function createRedisMock() {
  return {
    ttl: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  } as unknown as RedisClient & {
    ttl: ReturnType<typeof vi.fn>;
    incr: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };
}

describe('LockoutService', () => {
  let redis: ReturnType<typeof createRedisMock>;
  let service: LockoutService;

  beforeEach(() => {
    redis = createRedisMock();
    service = new LockoutService(redis);
  });

  describe('isLocked', () => {
    it('возвращает оставшееся время блокировки', async () => {
      redis.ttl.mockResolvedValue(1800);
      expect(await service.isLocked('artemii')).toBe(1800);
    });

    it('возвращает 0, если не заблокирован', async () => {
      redis.ttl.mockResolvedValue(-2);
      expect(await service.isLocked('artemii')).toBe(0);
    });

    it('fail-open: при ошибке возвращает 0', async () => {
      redis.ttl.mockRejectedValue(new Error('redis down'));
      expect(await service.isLocked('artemii')).toBe(0);
    });
  });

  describe('recordFailure', () => {
    it('инкрементит счётчик и ставит TTL сброса', async () => {
      redis.incr.mockResolvedValue(1);

      await service.recordFailure('artemii');

      expect(redis.incr).toHaveBeenCalledWith('fails:artemii');
      expect(redis.expire).toHaveBeenCalledWith('fails:artemii', 900, 'NX');
      // до порога ещё далеко — блокировки нет
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('блокирует на первом шаге ровно при достижении порога (5 неудач)', async () => {
      redis.incr.mockResolvedValue(5);

      await service.recordFailure('artemii');

      expect(redis.set).toHaveBeenCalledWith('lock:artemii', '1', 'EX', 30);
    });

    it('повышает длительность блокировки на следующем шаге (10 неудач → 300s)', async () => {
      redis.incr.mockResolvedValue(10);

      await service.recordFailure('artemii');

      expect(redis.set).toHaveBeenCalledWith('lock:artemii', '1', 'EX', 300);
    });

    it('не повышает блокировку между шагами (6 неудач)', async () => {
      redis.incr.mockResolvedValue(6);

      await service.recordFailure('artemii');

      expect(redis.set).not.toHaveBeenCalled();
    });

    it('fail-open: ошибка Redis не пробрасывается наружу', async () => {
      redis.incr.mockRejectedValue(new Error('redis down'));
      await expect(service.recordFailure('artemii')).resolves.toBeUndefined();
    });
  });

  describe('reset', () => {
    it('удаляет счётчик неудач и блокировку', async () => {
      await service.reset('artemii');
      expect(redis.del).toHaveBeenCalledWith('fails:artemii', 'lock:artemii');
    });

    it('fail-open: ошибка Redis не пробрасывается', async () => {
      redis.del.mockRejectedValue(new Error('redis down'));
      await expect(service.reset('artemii')).resolves.toBeUndefined();
    });
  });
});
