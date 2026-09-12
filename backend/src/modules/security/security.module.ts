import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenStoreService } from './token-store.service';
import { RateLimitService } from './rate-limit.service';
import { RateLimitInterceptor } from './rate-limit.interceptor';
import { LockoutService } from './lockout.service';

/**
 * Общий модуль безопасности.
 *
 * Регистрирует Passport-стратегию JWT и экспортирует `JwtModule` (для подписи
 * токенов) и `JwtAuthGuard`. Помечен `@Global()`, чтобы любой модуль мог
 * использовать guard и типы без явного импорта — и чтобы не возникало циклических
 * зависимостей между фича-модулями (`auth` <-> `users`).
 */
@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    TokenStoreService,
    RateLimitService,
    RateLimitInterceptor,
    LockoutService,
  ],
  exports: [
    JwtModule,
    JwtAuthGuard,
    TokenStoreService,
    RateLimitService,
    RateLimitInterceptor,
    LockoutService,
  ],
})
export class SecurityModule {}
