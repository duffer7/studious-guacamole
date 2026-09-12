import Redis from 'ioredis';

export const REDIS = Symbol('REDIS');

export type RedisClient = Redis;

/**
 * Единственный клиент Redis на процесс. ioredis сам управляет реконнектами.
 */
export function createRedis(): RedisClient {
  const url = process.env['REDIS_URL'];
  if (!url) {
    throw new Error('REDIS_URL is not set');
  }
  return new Redis(url);
}
