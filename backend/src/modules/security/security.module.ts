import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

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
  providers: [JwtStrategy, JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class SecurityModule {}
