import { Module } from '@nestjs/common';
import { UsersModule } from '@modules/user/users.module';
import { SecurityModule } from '@modules/security/security.module';
import { AuthService } from '@modules/auth/auth.service';
import { AuthController } from '@modules/auth/auth.controller';
import { TotpService } from '@modules/auth/totp.service';
@Module({
  imports: [SecurityModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, TotpService],
  exports: [AuthService],
})
export class AuthModule {}
