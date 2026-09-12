import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import type { TokenStoreService } from './token-store.service';
import type { JwtPayload } from './types';

function createTokenStoreMock() {
  return {
    isRevoked: vi.fn().mockResolvedValue(false),
  } as unknown as TokenStoreService & { isRevoked: ReturnType<typeof vi.fn> };
}

const validPayload: JwtPayload = {
  sub: 42,
  username: 'artemii',
  sid: 'sid-1',
  jti: 'jti-1',
  typ: 'access',
  exp: 1_800_000_000,
};

describe('JwtStrategy', () => {
  let tokenStore: ReturnType<typeof createTokenStoreMock>;
  let strategy: JwtStrategy;

  beforeEach(() => {
    process.env['JWT_SECRET'] = 'test-secret';
    tokenStore = createTokenStoreMock();
    strategy = new JwtStrategy(tokenStore);
  });

  it('возвращает AuthUser для валидного access-токена', async () => {
    const user = await strategy.validate(validPayload);

    expect(user).toEqual({
      userId: 42,
      username: 'artemii',
      sid: 'sid-1',
      jti: 'jti-1',
      exp: 1_800_000_000,
    });
    expect(tokenStore.isRevoked).toHaveBeenCalledWith('jti-1', 'sid-1');
  });

  it('отклоняет payload без sub/jti/sid', async () => {
    await expect(strategy.validate({ ...validPayload, jti: '' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('отклоняет refresh-токен (typ !== access)', async () => {
    await expect(strategy.validate({ ...validPayload, typ: 'refresh' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('отклоняет отозванный токен/сессию', async () => {
    tokenStore.isRevoked.mockResolvedValue(true);
    await expect(strategy.validate(validPayload)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
