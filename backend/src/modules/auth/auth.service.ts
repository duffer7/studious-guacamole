import {
  BadRequestException,
  ConflictException,
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
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { UserRow } from '@db/schema';

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
    private readonly jwtService: JwtService,
    private readonly totpService: TotpService,
    private readonly usersService: UsersService,
    private readonly tokenStoreService: TokenStoreService,
    private readonly lockoutService: LockoutService,
  ) {}

  private expOf(token: string): number {
    const decoded = this.jwtService.decode(token) as { exp: number };
    return decoded.exp;
  }

  private signToken(
    payload: JwtPayload,
    expiresIn: number | `${number}${'s' | 'm' | 'h' | 'd'}`,
  ): { token: string; exp: number } {
    const token = this.jwtService.sign(payload, { expiresIn });
    return { token, exp: this.expOf(token) };
  }

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

    await this.tokenStoreService.registerRefresh(sid, this.jtiOf(refresh.token), refresh.exp);
    await this.tokenStoreService.addUserSession(base.sub, sid);

    return { access_token: access.token, refresh_token: refresh.token };
  }

  private jtiOf(token: string): string {
    return (this.jwtService.decode(token) as JwtPayload).jti;
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const lockedFor = await this.lockoutService.isLocked(dto.username);
    if (lockedFor > 0) {
      throw new HttpException(
        { message: 'Account temporarily locked', retryAfter: lockedFor },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.usersService.findByUsername(dto.username);
    const passwordValid = await bcrypt.compare(
      dto.password,
      user?.password ?? AuthService.DUMMY_HASH,
    );
    if (!user || !passwordValid) {
      await this.lockoutService.recordFailure(dto.username);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabled) {
      if (!dto.code) {
        return { mfaRequired: true };
      }
      if (!user.mfaSecret || !this.totpService.verify(user.mfaSecret, dto.code)) {
        await this.lockoutService.recordFailure(dto.username);
        throw new UnauthorizedException('Invalid credentials');
      }
    }

    await this.lockoutService.reset(dto.username);
    return this.issueTokens({ sub: user.id, username: user.username });
  }

  async register(dto: RegisterDto): Promise<UserRow> {
    const existedUser = await this.usersService.findByUsername(dto.username);
    if (existedUser) {
      const field = existedUser.username === dto.username ? 'username' : 'email';
      throw new ConflictException({
        message: `${dto[field]} is already in use`,
        field,
      });
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.usersService.create({ ...dto, password: hashedPassword });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (await this.tokenStoreService.isRevoked(payload.jti, payload.sid)) {
      throw new UnauthorizedException('Session revoked');
    }

    // Сначала убеждаемся, что пользователь ещё существует, и только потом
    // сжигаем refresh — иначе при удалённом пользователе сожгли бы валидный токен.
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const consumed = await this.tokenStoreService.consumeRefresh(payload.sid, payload.jti);
    if (consumed === 'reused') {
      // Признак кражи: старый refresh снова в деле → рвём всю сессию.
      await this.tokenStoreService.revokeSession(payload.sid, this.expOf(refreshToken));
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (consumed === 'unknown') {
      throw new UnauthorizedException('Refresh session expired');
    }

    // Та же sid → та же сессия продолжается, но с новыми jti.
    return this.issueTokens({ sub: user.id, username: user.username }, payload.sid);
  }

  async enableMfa(authUser: AuthUser) {
    const user = await this.usersService.findById(authUser.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    const secret = this.totpService.generateSecret();
    await this.usersService.setMfa(user.id, false, secret);

    return {
      secret,
      otpauthUrl: this.totpService.generateQRCode(secret, user.username),
    };
  }

  async verifyMfa(authUser: AuthUser, code: string) {
    const user = await this.usersService.findById(authUser.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.mfaSecret) {
      throw new BadRequestException('MFA is not initialized. Call /auth/mfa/enable first');
    }
    if (!this.totpService.verify(user.mfaSecret, code)) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.usersService.setMfa(user.id, true, user.mfaSecret);
    // Состояние MFA изменилось — отзываем все прошлые сессии.
    await this.tokenStoreService.revokeAllUserSessions(user.id);
    return { mfaEnabled: true };
  }

  async disableMfa(authUser: AuthUser, code: string) {
    const user = await this.usersService.findById(authUser.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (!user.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled');
    }
    if (!user.mfaSecret || !this.totpService.verify(user.mfaSecret, code)) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.usersService.setMfa(user.id, false, null);
    // Состояние MFA изменилось — отзываем все прошлые сессии.
    await this.tokenStoreService.revokeAllUserSessions(user.id);
    return { mfaEnabled: false };
  }

  async logout(authUser: AuthUser): Promise<void> {
    // Отзываем всю сессию: и access, и refresh, привязанные к этому sid.
    // TTL берём по refresh (7d), т.к. refresh живёт дольше access.
    const refreshExp = Math.floor(Date.now() / 1000) + AuthService.REFRESH_TTL_SECONDS;
    await this.tokenStoreService.revokeSession(authUser.sid, refreshExp);
  }

  /** Выход со всех устройств — отзываем все активные сессии пользователя. */
  async logoutAll(authUser: AuthUser): Promise<void> {
    await this.tokenStoreService.revokeAllUserSessions(authUser.userId);
  }
}
