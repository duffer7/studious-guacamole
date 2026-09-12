import { Inject, Injectable } from '@nestjs/common';
import { REDIS, type RedisClient } from '@/redis/redis.provider';

const JTI_PREFIX = 'revoked:jti:';
const SID_PREFIX = 'revoked:sid:';
const USER_SESSIONS_PREFIX = 'user:sessions:';
const REFRESH_PREFIX = 'refresh:';
const MS_PER_SECOND = 1000;
/** Максимальный срок жизни refresh-токена — используется как TTL отзыва. */
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class TokenStoreService {
  constructor(@Inject(REDIS) private readonly redis: RedisClient) {}

  async revokeSession(sid: string, expSeconds: number): Promise<void> {
    const ttl = expSeconds - Math.floor(Date.now() / MS_PER_SECOND);
    if (ttl > 0) {
      const pipeline = this.redis.pipeline();
      pipeline.set(`${SID_PREFIX}${sid}`, '1', 'EX', ttl);
      pipeline.del(`${REFRESH_PREFIX}${sid}`);
      await pipeline.exec();
    }
  }

  /** Запомнить refresh-токен как единственный живой для сессии. */
  async registerRefresh(sid: string, jti: string, expSeconds: number): Promise<void> {
    const ttl = expSeconds - Math.floor(Date.now() / MS_PER_SECOND);
    if (ttl > 0) {
      await this.redis.set(`${REFRESH_PREFIX}${sid}`, jti, 'EX', ttl);
    }
  }

  /**
   * Проверить и "сжечь" refresh-токен при ротации.
   * Возвращает 'ok' — можно выдавать новую пару;
   * 'reused' — пришёл старый токен (кража) → caller должен убить всю sid;
   * 'unknown' — нет записи (сессия истекла / уже отозвана).
   */
  async consumeRefresh(sid: string, jti: string): Promise<'ok' | 'reused' | 'unknown'> {
    const current = await this.redis.get(`${REFRESH_PREFIX}${sid}`);
    if (current === null) return 'unknown';
    if (current !== jti) return 'reused'; // пришёл не текущий → старая ротация
    await this.redis.del(`${REFRESH_PREFIX}${sid}`); // сжигаем; caller зарегистрирует новый
    return 'ok';
  }

  /** Зарегистрировать активную сессию пользователя (для «выйти со всех устройств»). */
  async addUserSession(userId: number, sid: string): Promise<void> {
    const key = `${USER_SESSIONS_PREFIX}${userId}`;
    const pipeline = this.redis.pipeline();
    pipeline.sadd(key, sid);
    pipeline.expire(key, SESSION_TTL_SECONDS, 'NX');
    await pipeline.exec();
  }

  /** Отозвать все активные сессии пользователя. */
  async revokeAllUserSessions(userId: number): Promise<void> {
    const key = `${USER_SESSIONS_PREFIX}${userId}`;
    const sids = await this.redis.smembers(key);
    const pipeline = this.redis.pipeline();
    for (const sid of sids) {
      pipeline.set(`${SID_PREFIX}${sid}`, '1', 'EX', SESSION_TTL_SECONDS);
      pipeline.del(`${REFRESH_PREFIX}${sid}`);
    }
    pipeline.del(key);
    await pipeline.exec();
  }

  /**
   * true, если токен или его сессия отозваны.
   * Работает "fail-closed": если Redis недоступен, выбросит исключение, и запрос
   * будет отклонён — безопаснее пропустить запрос, чем пустить отозванный токен.
   */
  async isRevoked(jti: string, sid: string): Promise<boolean> {
    const [byJti, bySid] = await this.redis.mget(`${JTI_PREFIX}${jti}`, `${SID_PREFIX}${sid}`);
    return byJti !== null || bySid !== null;
  }
}
