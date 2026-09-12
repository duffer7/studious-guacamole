import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  /** Базовое имя корзины, напр. 'login' */
  bucket: string;
  /** Максимум попыток в окне */
  limit: number;
  /** Окно в секундах */
  window: number;
  /** Лимитировать также по username (из body) */
  byUsername?: boolean;
}

export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (opts: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, opts);
