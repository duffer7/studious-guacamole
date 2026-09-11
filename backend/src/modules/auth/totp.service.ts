import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';

const ISSUER = 'MessengerApp';

@Injectable()
export class TotpService {
  generateSecret(): string {
    return generateSecret();
  }

  generateQRCode(secret: string, username: string): string {
    return generateURI({
      strategy: 'totp',
      issuer: ISSUER,
      label: username,
      secret,
    });
  }

  verify(secret: string, token: string | undefined): boolean {
    if (!token) {
      return false;
    }
    try {
      const result = verifySync({
        secret,
        token,
        // allow one step of clock drift in either direction
        epochTolerance: 30,
      });
      return result.valid ?? false;
    } catch {
      return false;
    }
  }
}
