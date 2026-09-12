import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpException, UnauthorizedException } from '@nestjs/common';

// bcrypt мокаем целиком: пароль считаем верным, кроме 'wrong-password'.
vi.mock('bcrypt', () => ({
  compare: vi.fn(async (_plain: string) => _plain !== 'wrong-password'),
  hash: vi.fn(async () => 'hashed'),
}));

import * as bcrypt from 'bcrypt';
import { AuthService, type AuthTokens, type MfaRequired } from './auth.service';
import type { JwtService } from '@nestjs/jwt';
import type { UsersService } from '@modules/user/users.service';
import type { TotpService } from './totp.service';
import type { TokenStoreService } from '@modules/security/token-store.service';
import type { LockoutService } from '@modules/security/lockout.service';
import type { JwtPayload } from '@modules/security/types';

/**
 * Фейк JwtService: sign кодирует payload в "token" (JSON), decode его читает.
 * Это позволяет честно прогонять expOf/jtiOf без реальной криптографии.
 */
function createJwtMock() {
  const ttlSeconds: Record<string, number> = { '15m': 900, '7d': 604800 };
  return {
    sign: vi.fn((payload: JwtPayload, opts: { expiresIn?: string | number }) => {
      const seconds =
        typeof opts?.expiresIn === 'number' ? opts.expiresIn : ttlSeconds[opts?.expiresIn ?? '15m'];
      const exp = Math.floor(Date.now() / 1000) + (seconds ?? 900);
      return JSON.stringify({ ...payload, exp });
    }),
    decode: vi.fn((token: string) => {
      try {
        return JSON.parse(token) as JwtPayload;
      } catch {
        // не-JSON строку (как в тестах) трактуем как токен с exp в будущем
        return { exp: Math.floor(Date.now() / 1000) + 600 } as JwtPayload;
      }
    }),
    verifyAsync: vi.fn(),
  } as unknown as JwtService & {
    sign: ReturnType<typeof vi.fn>;
    decode: ReturnType<typeof vi.fn>;
    verifyAsync: ReturnType<typeof vi.fn>;
  };
}

const activeUser = {
  id: 1,
  username: 'artemii',
  password: '$2b$10$hash',
  email: 'a@example.com',
  displayName: null,
  avatarUrl: null,
  mfaEnabled: false,
  mfaSecret: null,
  createdAt: new Date(),
};

describe('AuthService', () => {
  let jwt: ReturnType<typeof createJwtMock>;
  let users: {
    findByUsername: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    setMfa: ReturnType<typeof vi.fn>;
  };
  let totp: { verify: ReturnType<typeof vi.fn> };
  let tokenStore: {
    registerRefresh: ReturnType<typeof vi.fn>;
    addUserSession: ReturnType<typeof vi.fn>;
    isRevoked: ReturnType<typeof vi.fn>;
    consumeRefresh: ReturnType<typeof vi.fn>;
    revokeSession: ReturnType<typeof vi.fn>;
    revokeAllUserSessions: ReturnType<typeof vi.fn>;
  };
  let lockout: {
    isLocked: ReturnType<typeof vi.fn>;
    recordFailure: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
  };
  let service: AuthService;

  beforeEach(async () => {
    jwt = createJwtMock();
    users = {
      findByUsername: vi.fn().mockResolvedValue(activeUser),
      findById: vi.fn().mockResolvedValue(activeUser),
      setMfa: vi.fn().mockResolvedValue(activeUser),
    };
    totp = { verify: vi.fn().mockReturnValue(true) };
    tokenStore = {
      registerRefresh: vi.fn().mockResolvedValue(undefined),
      addUserSession: vi.fn().mockResolvedValue(undefined),
      isRevoked: vi.fn().mockResolvedValue(false),
      consumeRefresh: vi.fn().mockResolvedValue('ok'),
      revokeSession: vi.fn().mockResolvedValue(undefined),
      revokeAllUserSessions: vi.fn().mockResolvedValue(undefined),
    };
    lockout = {
      isLocked: vi.fn().mockResolvedValue(0),
      recordFailure: vi.fn().mockResolvedValue(undefined),
      reset: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(bcrypt.compare).mockClear();

    service = new AuthService(
      jwt as unknown as JwtService,
      totp as unknown as TotpService,
      users as unknown as UsersService,
      tokenStore as unknown as TokenStoreService,
      lockout as unknown as LockoutService,
    );
  });

  describe('login', () => {
    it('выдаёт токены и регистрирует refresh/сессию при верных кредах', async () => {
      const result = (await service.login({
        username: 'artemii',
        password: 'good-password',
      })) as AuthTokens;

      expect(result.access_token).toBeDefined();
      expect(result.refresh_token).toBeDefined();
      expect(tokenStore.registerRefresh).toHaveBeenCalledOnce();
      expect(tokenStore.addUserSession).toHaveBeenCalledWith(1, expect.any(String));
      expect(lockout.reset).toHaveBeenCalledWith('artemii');
    });

    it('отдаёт mfaRequired, если MFA включён и код не передан', async () => {
      users.findByUsername.mockResolvedValue({ ...activeUser, mfaEnabled: true, mfaSecret: 'S' });

      const result = await service.login({ username: 'artemii', password: 'good-password' });

      expect(result).toEqual({ mfaRequired: true } satisfies MfaRequired);
      expect(lockout.recordFailure).not.toHaveBeenCalled();
    });

    it('при неверном MFA-коде фиксирует неудачу и кидает 401', async () => {
      users.findByUsername.mockResolvedValue({ ...activeUser, mfaEnabled: true, mfaSecret: 'S' });
      totp.verify.mockReturnValue(false);

      await expect(
        service.login({ username: 'artemii', password: 'good-password', code: '000000' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(lockout.recordFailure).toHaveBeenCalledWith('artemii');
    });

    it('при неверном пароле фиксирует неудачу и кидает 401', async () => {
      await expect(
        service.login({ username: 'artemii', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(lockout.recordFailure).toHaveBeenCalledWith('artemii');
    });

    it('анти-timing: вызывает bcrypt.compare даже для несуществующего юзера', async () => {
      users.findByUsername.mockResolvedValue(undefined);

      await expect(
        service.login({ username: 'ghost', password: 'good-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('если аккаунт заблокирован — кидает 429 с retryAfter', async () => {
      lockout.isLocked.mockResolvedValue(120);

      await expect(
        service.login({ username: 'artemii', password: 'good-password' }),
      ).rejects.toMatchObject({ status: 429 });
    });
  });

  describe('refresh', () => {
    function refreshPayload(overrides: Partial<JwtPayload> = {}): JwtPayload {
      return {
        sub: 1,
        username: 'artemii',
        sid: 'sid-1',
        jti: 'jti-1',
        typ: 'refresh',
        exp: Math.floor(Date.now() / 1000) + 600,
        ...overrides,
      };
    }

    it('успешно ротирует токены при валидном refresh', async () => {
      jwt.verifyAsync.mockResolvedValue(refreshPayload());

      const result = (await service.refresh('token')) as AuthTokens;

      expect(result.access_token).toBeDefined();
      expect(tokenStore.consumeRefresh).toHaveBeenCalledWith('sid-1', 'jti-1');
    });

    it('отклоняет access-токен (typ !== refresh)', async () => {
      jwt.verifyAsync.mockResolvedValue(refreshPayload({ typ: 'access' }));
      await expect(service.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('отклоняет отозванную сессию', async () => {
      jwt.verifyAsync.mockResolvedValue(refreshPayload());
      tokenStore.isRevoked.mockResolvedValue(true);
      await expect(service.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(tokenStore.consumeRefresh).not.toHaveBeenCalled();
    });

    it('detect reuse: при "reused" отзывает сессию и кидает 401', async () => {
      jwt.verifyAsync.mockResolvedValue(refreshPayload());
      tokenStore.consumeRefresh.mockResolvedValue('reused');

      await expect(service.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(tokenStore.revokeSession).toHaveBeenCalledWith('sid-1', expect.any(Number));
    });

    it('не сжигает refresh, если пользователь удалён', async () => {
      jwt.verifyAsync.mockResolvedValue(refreshPayload());
      users.findById.mockResolvedValue(undefined);

      await expect(service.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(tokenStore.consumeRefresh).not.toHaveBeenCalled();
    });
  });

  describe('logout / logoutAll / MFA', () => {
    const authUser = { userId: 1, username: 'artemii', sid: 'sid-1', jti: 'jti-1', exp: 0 };

    it('logout отзывает текущую сессию', async () => {
      await service.logout(authUser);
      expect(tokenStore.revokeSession).toHaveBeenCalledWith('sid-1', expect.any(Number));
    });

    it('logoutAll отзывает все сессии пользователя', async () => {
      await service.logoutAll(authUser);
      expect(tokenStore.revokeAllUserSessions).toHaveBeenCalledWith(1);
    });

    it('verifyMfa отзывает все сессии после активации', async () => {
      users.findById.mockResolvedValue({ ...activeUser, mfaSecret: 'S', mfaEnabled: false });
      totp.verify.mockReturnValue(true);

      await service.verifyMfa(authUser, '123456');

      expect(tokenStore.revokeAllUserSessions).toHaveBeenCalledWith(1);
    });

    it('disableMfa отзывает все сессии после отключения', async () => {
      users.findById.mockResolvedValue({ ...activeUser, mfaSecret: 'S', mfaEnabled: true });
      totp.verify.mockReturnValue(true);

      await service.disableMfa(authUser, '123456');

      expect(tokenStore.revokeAllUserSessions).toHaveBeenCalledWith(1);
    });
  });
});

// HttpException импортируется для типов статуса в тестах
void HttpException;
