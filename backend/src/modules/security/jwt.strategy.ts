import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenStoreService } from '@modules/security/token-store.service';
import type { AuthUser, JwtPayload } from '@modules/security/types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly tokenStore: TokenStoreService) {
    const secret = process.env['JWT_SECRET'];
    if (!secret) {
      throw new Error('JWT_SECRET is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (!payload?.sub || !payload.jti || !payload.sid) {
      throw new UnauthorizedException('Invalid token payload');
    }
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    if (await this.tokenStore.isRevoked(payload.jti, payload.sid)) {
      throw new UnauthorizedException('Token has been revoked');
    }
    return {
      userId: payload.sub,
      username: payload.username,
      sid: payload.sid,
      jti: payload.jti,
      exp: payload.exp!,
    };
  }
}
