import { Module } from '@nestjs/common';
import { UsersModule } from '@modules/user/users.module';
import { SecurityModule } from '@modules/security/security.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TotpService } from './totp.service';
@Module({
  imports: [SecurityModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService, TotpService],
  exports: [AuthService],
})
export class AuthModule {}
