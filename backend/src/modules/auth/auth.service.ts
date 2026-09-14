import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { UsersService } from '@modules/user/users.service';
import type { AuthUser, JwtPayload } from '@modules/security/types';
import { TokenStoreService } from '@modules/security/token-store.service';
import { LockoutService } from '@modules/security/lockout.service';
import { TotpService } from '@modules/auth/totp.service';
import type { LoginDto } from '@modules/auth/dto/login.dto';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

/** Ответ login, когда пароль верен, но требуется MFA-код. */
export interface MfaRequired {
  mfaRequired: true;
}

export type LoginResult = AuthTokens | MfaRequired;

const SECONDS_PER_DAY = 24 * 60 * 60;

@Injectable()
export class AuthService {
  private static readonly ACCESS_TOKEN_TTL = '15m';
  private static readonly REFRESH_TOKEN_TTL = '7d';
  /** Длительность refresh в секундах — используется как TTL отзыва сессии. */
  private static readonly REFRESH_TTL_SECONDS = 7 * SECONDS_PER_DAY;
  /**
   * Хеш-заглушка для сравнения пароля, когда пользователь не найден.
   * Выравнивает время ответа и мешает перечислять логины по таймингу.
   */
  private static readonly DUMMY_HASH =
    '$2b$10$CwTycUXWue0Thq9StjUM0uJ8.B7E0hXk8p0Xm3wJm6g9Q0o5fQmK';

  constructor(
    private readonly jwt: JwtService,
    private readonly totp: TotpService,
    private readonly users: UsersService,
    private readonly tokenStore: TokenStoreService,
    private readonly lockout: LockoutService,
  ) {}

  /** Декодированный exp (unix-секунды) подписанного токена — нужен для TTL. */
  private expOf(token: string): number {
    const decoded = this.jwt.decode(token) as { exp: number };
    return decoded.exp;
  }

  private signToken(
    payload: JwtPayload,
    expiresIn: number | `${number}${'s' | 'm' | 'h' | 'd'}`,
  ): { token: string; exp: number } {
    const token = this.jwt.sign(payload, { expiresIn });
    return { token, exp: this.expOf(token) };
  }

  /** Выпуск пары токенов. `sid` можно передать (ротация), иначе создаётся новая сессия. */
  private async issueTokens(
    base: { sub: number; username: string },
    sid: string = randomUUID(),
  ): Promise<AuthTokens> {
    const access = this.signToken(
      { ...base, sid, jti: randomUUID(), typ: 'access' },
      AuthService.ACCESS_TOKEN_TTL,
    );
    const refresh = this.signToken(
      { ...base, sid, jti: randomUUID(), typ: 'refresh' },
      AuthService.REFRESH_TOKEN_TTL,
    );

    // Регистрируем refresh как текущий живой для сессии (для ротации/reuse detection).
    await this.tokenStore.registerRefresh(sid, this.jtiOf(refresh.token), refresh.exp);
    // Запоминаем сессию за пользователем (для «выйти со всех устройств»).
    await this.tokenStore.addUserSession(base.sub, sid);

    return { access_token: access.token, refresh_token: refresh.token };
  }

  private jtiOf(token: string): string {
    return (this.jwt.decode(token) as JwtPayload).jti;
  }
  async login(dto: LoginDto): Promise<LoginResult> {
    // 1) Проверка блокировки аккаунта (прогрессивный lockout).
    const lockedFor = await this.lockout.isLocked(dto.username);
    if (lockedFor > 0) {
      throw new HttpException(
        { message: 'Account temporarily locked', retryAfter: lockedFor },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2) Проверка пароля. Даже если пользователя нет — сравниваем с заглушкой,
    //    чтобы время ответа не выдавало существование логина.
    const user = await this.users.findByUsername(dto.username);
    const passwordValid = await bcrypt.compare(
      dto.password,
      user?.password ?? AuthService.DUMMY_HASH,
    );
    if (!user || !passwordValid) {
      await this.lockout.recordFailure(dto.username);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3) MFA: если включён, но код не передан — не раскрываем статус 401-й ошибкой,
    //    а возвращаем явный флаг. Пароль уже подтверждён на этом шаге.
    if (user.mfaEnabled) {
      if (!dto.code) {
        return { mfaRequired: true };
      }
      if (!user.mfaSecret || !this.totp.verify(user.mfaSecret, dto.code)) {
        await this.lockout.recordFailure(dto.username);
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    await this.lockout.reset(dto.username);
    return this.issueTokens({ sub: user.id, username: user.username });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (await this.tokenStore.isRevoked(payload.jti, payload.sid)) {
      throw new UnauthorizedException('Session revoked');
    }

    // Сначала убеждаемся, что пользователь ещё существует, и только потом
    // сжигаем refresh — иначе при удалённом пользователе сожгли бы валидный токен.
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const consumed = await this.tokenStore.consumeRefresh(payload.sid, payload.jti);
    if (consumed === 'reused') {
      // Признак кражи: старый refresh снова в деле → рвём всю сессию.
      await this.tokenStore.revokeSession(payload.sid, this.expOf(refreshToken));
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (consumed === 'unknown') {
      throw new UnauthorizedException('Refresh session expired');
    }

    // Та же sid → та же сессия продолжается, но с новыми jti.
    return this.issueTokens({ sub: user.id, username: user.username }, payload.sid);
  }

  async enableMfa(authUser: AuthUser) {
    const user = await this.users.findById(authUser.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    const secret = this.totp.generateSecret();
    await this.users.setMfa(user.id, false, secret);

    return {
      secret,
      otpauthUrl: this.totp.generateQRCode(secret, user.username),
    };
  }

  async verifyMfa(authUser: AuthUser, code: string) {
    const user = await this.users.findById(authUser.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.mfaSecret) {
      throw new BadRequestException('MFA is not initialized. Call /auth/mfa/enable first');
    }
    if (!this.totp.verify(user.mfaSecret, code)) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.users.setMfa(user.id, true, user.mfaSecret);
    // Состояние MFA изменилось — отзываем все прошлые сессии.
    await this.tokenStore.revokeAllUserSessions(user.id);
    return { mfaEnabled: true };
  }

  async disableMfa(authUser: AuthUser, code: string) {
    const user = await this.users.findById(authUser.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }
    if (!user.mfaSecret || !this.totp.verify(user.mfaSecret, code)) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.users.setMfa(user.id, false, null);
    // Состояние MFA изменилось — отзываем все прошлые сессии.
    await this.tokenStore.revokeAllUserSessions(user.id);
    return { mfaEnabled: false };
  }

  async logout(authUser: AuthUser): Promise<void> {
    // Отзываем всю сессию: и access, и refresh, привязанные к этому sid.
    // TTL берём по refresh (7d), т.к. refresh живёт дольше access.
    const refreshExp = Math.floor(Date.now() / 1000) + AuthService.REFRESH_TTL_SECONDS;
    await this.tokenStore.revokeSession(authUser.sid, refreshExp);
  }

  /** Выход со всех устройств — отзываем все активные сессии пользователя. */
  async logoutAll(authUser: AuthUser): Promise<void> {
    await this.tokenStore.revokeAllUserSessions(authUser.userId);
  }
}
