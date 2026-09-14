import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@modules/security/jwt.strategy';
import { JwtAuthGuard } from '@modules/security/jwt-auth.guard';
import { TokenStoreService } from '@modules/security/token-store.service';
import { RateLimitService } from '@modules/security/rate-limit.service';
import { RateLimitInterceptor } from '@modules/security/rate-limit.interceptor';
import { LockoutService } from '@modules/security/lockout.service';

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
