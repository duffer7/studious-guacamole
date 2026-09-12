import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS, type RedisClient } from '@/redis/redis.provider';

const MAX_FAILS_BEFORE_LOCK = 5;
const LOCK_STEPS = [30, 300, 1800]; // 30s, 5m, 30m

@Injectable()
export class LockoutService {
  private readonly logger = new Logger(LockoutService.name);

  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  /** Время блокировки в секундах (0 — не заблокирован). Fail-open → 0. */
  async isLocked(username: string): Promise<number> {
    try {
      const ttl = await this.redis.ttl(`lock:${username}`);
      return ttl > 0 ? ttl : 0;
    } catch (error) {
      this.logger.warn(`Lockout check failed (fail-open) for ${username}: ${String(error)}`);
      return 0;
    }
  }

  async recordFailure(username: string): Promise<void> {
    try {
      const fails = await this.redis.incr(`fails:${username}`);
      await this.redis.expire(`fails:${username}`, 900, 'NX'); // сброс счётчика за 15 мин

      if (fails >= MAX_FAILS_BEFORE_LOCK && (fails - MAX_FAILS_BEFORE_LOCK) % 5 === 0) {
        const level = Math.min(
          Math.floor((fails - MAX_FAILS_BEFORE_LOCK) / 5),
          LOCK_STEPS.length - 1,
        );
        const lockTtl = LOCK_STEPS[level]!;
        await this.redis.set(`lock:${username}`, '1', 'EX', lockTtl);
      }
    } catch (error) {
      this.logger.warn(`Lockout recordFailure failed for ${username}: ${String(error)}`);
    }
  }

  async reset(username: string): Promise<void> {
    try {
      await this.redis.del(`fails:${username}`, `lock:${username}`);
    } catch (error) {
      this.logger.warn(`Lockout reset failed for ${username}: ${String(error)}`);
    }
  }
}
