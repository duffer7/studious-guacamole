import { REDIS, type RedisClient } from '@/redis/redis.provider';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class PresenceService {
  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  private key(userId: number) {
    return `presence:${userId}`;
  }
  private sidKey(userId: number) {
    return `presence:sids:${userId}`;
  }

  async markOnline(userId: number, sid: string) {
    const pipeline = this.redis.pipeline();
    pipeline.set(this.key(userId), '1', 'EX', 60);
    pipeline.sadd(this.sidKey(userId), sid);
    pipeline.expire(this.sidKey(userId), 60);
    await pipeline.exec();
  }

  // Возвращает true, если у пользователя ещё есть другие активные сессии.
  async markOffline(userId: number, sid: string): Promise<boolean> {
    await this.redis.srem(this.sidKey(userId), sid);
    const remaining = await this.redis.scard(this.sidKey(userId));

    if (remaining === 0) {
      await this.redis.del(this.key(userId));
    }

    return remaining > 0;
  }

  async isOnline(userId: number) {
    return (await this.redis.exists(this.key(userId))) === 1;
  }
}
