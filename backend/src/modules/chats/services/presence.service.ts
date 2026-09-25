import { REDIS, type RedisClient } from '@/redis/redis.provider';
import { Inject, Injectable, Logger } from '@nestjs/common';

const PRESENCE_TTL_SEC = 60;

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  private key(userId: number) {
    return `presence:${userId}`;
  }

  private sidKey(userId: number) {
    return `presence:sids:${userId}`;
  }

  /** Помечает сокет онлайн и продлевает TTL. Ошибка Redis не рвёт соединение. */
  async markOnline(userId: number, socketId: string): Promise<void> {
    await this.touch(userId, socketId);
  }

  /** Продлевает TTL живого сокета. */
  async refresh(userId: number, socketId: string): Promise<void> {
    await this.touch(userId, socketId);
  }

  /**
   * Снимает сокет с учёта.
   * true — у пользователя остались другие сокеты.
   * При ошибке Redis возвращает true, чтобы не записать ложный офлайн.
   */
  async markOffline(userId: number, socketId: string): Promise<boolean> {
    try {
      await this.redis.srem(this.sidKey(userId), socketId);
      const remaining = await this.redis.scard(this.sidKey(userId));
      if (remaining === 0) {
        await this.redis.del(this.key(userId));
      }
      return remaining > 0;
    } catch (err) {
      this.logger.warn(`presence offline failed for user ${userId}: ${String(err)}`);
      return true;
    }
  }

  /** null — Redis недоступен, статус неизвестен. */
  async isOnline(userId: number): Promise<boolean | null> {
    const many = await this.isOnlineMany([userId]);
    return many.get(userId) ?? null;
  }

  async isOnlineMany(userIds: number[]): Promise<Map<number, boolean | null>> {
    const unique = [...new Set(userIds)];
    const result = new Map<number, boolean | null>();
    if (unique.length === 0) return result;

    try {
      const pipeline = this.redis.pipeline();
      for (const id of unique) pipeline.exists(this.key(id));
      const rows = await pipeline.exec();
      unique.forEach((id, index) => {
        const row = rows?.[index];
        if (!row || row[0]) {
          result.set(id, null);
          return;
        }
        result.set(id, row[1] === 1);
      });
    } catch (err) {
      this.logger.warn(`presence read failed: ${String(err)}`);
      for (const id of unique) result.set(id, null);
    }

    return result;
  }

  private async touch(userId: number, socketId: string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.set(this.key(userId), '1', 'EX', PRESENCE_TTL_SEC);
      pipeline.sadd(this.sidKey(userId), socketId);
      pipeline.expire(this.sidKey(userId), PRESENCE_TTL_SEC);
      await pipeline.exec();
    } catch (err) {
      this.logger.warn(`presence touch failed for user ${userId}: ${String(err)}`);
    }
  }
}
