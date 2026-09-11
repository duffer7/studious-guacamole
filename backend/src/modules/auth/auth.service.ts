import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '@modules/user/users.service';
import type { AuthUser, JwtPayload } from '@modules/security/types';
import { TotpService } from './totp.service';
import type { LoginDto } from './dto/login.dto';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  private static readonly ACCESS_TOKEN_TTL = '15m';
  private static readonly REFRESH_TOKEN_TTL = '7d';

  constructor(
    private readonly jwt: JwtService,
    private readonly totp: TotpService,
    private readonly users: UsersService,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.users.findByUsername(dto.username);
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (user.mfaEnabled) {
      if (!dto.code) {
        throw new UnauthorizedException('MFA code required');
      }
      if (!user.mfaSecret || !this.totp.verify(user.mfaSecret, dto.code)) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    return this.issueTokens({ sub: user.id, username: user.username });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return this.issueTokens({ sub: user.id, username: user.username });
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
    return { mfaEnabled: false };
  }

  private issueTokens(payload: JwtPayload): AuthTokens {
    return {
      access_token: this.jwt.sign(payload, {
        expiresIn: AuthService.ACCESS_TOKEN_TTL,
      }),
      refresh_token: this.jwt.sign(payload, {
        expiresIn: AuthService.REFRESH_TOKEN_TTL,
      }),
    };
  }
}
