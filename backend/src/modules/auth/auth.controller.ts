import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/security/jwt-auth.guard';
import type { AuthUser } from '@modules/security/types';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { MfaDto } from './dto/mfa.dto';
import { RefreshDto } from './dto/refresh.dto';
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Вход пользователя' })
  @ApiResponse({ status: 200, description: 'Успешный вход' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Обновить токен' })
  @ApiResponse({ status: 200, description: 'Новый access token' })
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Включить MFA (получить секрет и otpauth URL)' })
  @ApiResponse({ status: 200, description: 'MFA инициализировано' })
  async enableMfa(@Req() req: { user: AuthUser }) {
    return this.authService.enableMfa(req.user);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подтвердить MFA кодом и активировать MFA' })
  @ApiResponse({ status: 200, description: 'MFA активировано' })
  async verifyMfa(@Req() req: { user: AuthUser }, @Body() dto: MfaDto) {
    return this.authService.verifyMfa(req.user, dto.code);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отключить MFA (требуется текущий код)' })
  @ApiResponse({ status: 200, description: 'MFA отключено' })
  async disableMfa(@Req() req: { user: AuthUser }, @Body() dto: MfaDto) {
    return this.authService.disableMfa(req.user, dto.code);
  }
}
