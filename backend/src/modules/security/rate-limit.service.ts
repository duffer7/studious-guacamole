import { Inject, Injectable, Logger } from '@nestjs/common';
import { REDIS, type RedisClient } from '@/redis/redis.provider';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  /**
   * Fixed-window счётчик. Атомарно: INCR + EXPIRE(NX).
   *
   * Fail-open: если Redis недоступен, запрос пропускается (allowed=true) —
   * недоступность вспомогательного хранилища не должна ломать логин.
   *
   * @param key    уникальный ключ (напр. `rl:login:ip:1.2.3.4`)
   * @param limit  максимум попыток в окне
   * @param window окно в секундах
   */
  async hit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        // окно начинается сейчас; NX чтобы не сбрасывать TTL при гонках
        await this.redis.expire(key, windowSeconds, 'NX');
      }

      const ttl = await this.redis.ttl(key);
      const allowed = count <= limit;

      return {
        allowed,
        remaining: Math.max(0, limit - count),
        retryAfterSeconds: allowed ? 0 : Math.max(ttl, 0),
      };
    } catch (error) {
      this.logger.warn(`Rate limit check failed (fail-open) for ${key}: ${String(error)}`);
      return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
    }
  }

  /** Сколько ещё залипнуть (для progressive lockout). Fail-open → 0. */
  async lockedFor(key: string): Promise<number> {
    try {
      const ttl = await this.redis.ttl(key);
      return ttl > 0 ? ttl : 0;
    } catch (error) {
      this.logger.warn(`Rate limit ttl check failed (fail-open) for ${key}: ${String(error)}`);
      return 0;
    }
  }
}
