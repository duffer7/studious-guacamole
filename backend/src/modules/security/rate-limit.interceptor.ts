import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { RateLimitService } from './rate-limit.service';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.decorator';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimit: RateLimitService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const opts = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!opts) return next.handle();

    try {
      const req = context.switchToHttp().getRequest();
      const ip = req.ip ?? req.socket?.remoteAddress ?? 'unknown';

      // 1) лимит по IP
      const byIp = await this.rateLimit.hit(`rl:${opts.bucket}:ip:${ip}`, opts.limit, opts.window);
      if (!byIp.allowed) {
        this.throwTooMany(byIp.retryAfterSeconds);
      }

      // 2) лимит по username (дополнительно)
      if (opts.byUsername && typeof req.body?.username === 'string') {
        const byUser = await this.rateLimit.hit(
          `rl:${opts.bucket}:user:${req.body.username}`,
          opts.limit,
          opts.window,
        );
        if (!byUser.allowed) {
          this.throwTooMany(byUser.retryAfterSeconds);
        }
      }
    } catch (error) {
      // HttpException (429) пробрасываем как есть; любую другую ошибку игнорируем
      // (fail-open) — сбой вспомогательного лимитера не должен блокировать запрос.
      if (error instanceof HttpException) throw error;
      this.logger.warn(`Rate limit interceptor failed (fail-open): ${String(error)}`);
    }

    return next.handle();
  }

  private throwTooMany(retryAfter: number): never {
    throw new HttpException(
      { message: 'Too many requests', retryAfter },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
