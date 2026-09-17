import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/security/jwt-auth.guard';
import type { AuthUser } from '@modules/security/types';
import { AuthService, type LoginResult } from '@modules/auth/auth.service';
import { LoginDto } from '@modules/auth/dto/login.dto';
import { MfaDto } from '@modules/auth/dto/mfa.dto';
import { RefreshDto } from '@modules/auth/dto/refresh.dto';
import { RateLimit } from '@modules/security/rate-limit.decorator';
import { RateLimitInterceptor } from '@modules/security/rate-limit.interceptor';
import { RegisterDto } from '@modules/auth/dto/register.dto';
import { UserRow } from '@db/schema';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @RateLimit({ bucket: 'login', limit: 5, window: 60, byUsername: true })
  @UseInterceptors(RateLimitInterceptor)
  @ApiOperation({ summary: 'Вход пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Успешный вход или { mfaRequired: true }, если требуется MFA-код',
  })
  async login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto);
  }

  @Post('register')
  @RateLimit({ bucket: 'register', limit: 5, window: 60 })
  @UseInterceptors(RateLimitInterceptor)
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({
    status: 201,
    description: 'Успешная регистрация пользователя',
  })
  async register(@Body() dto: RegisterDto): Promise<UserRow> {
    return this.authService.register(dto);
  }

  @Post('refresh')
  @RateLimit({ bucket: 'refresh', limit: 30, window: 60 })
  @UseInterceptors(RateLimitInterceptor)
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
  @RateLimit({ bucket: 'mfa', limit: 5, window: 60 })
  @UseInterceptors(RateLimitInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Подтвердить MFA кодом и активировать MFA' })
  @ApiResponse({ status: 200, description: 'MFA активировано' })
  async verifyMfa(@Req() req: { user: AuthUser }, @Body() dto: MfaDto) {
    return this.authService.verifyMfa(req.user, dto.code);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @RateLimit({ bucket: 'mfa', limit: 5, window: 60 })
  @UseInterceptors(RateLimitInterceptor)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отключить MFA (требуется текущий код)' })
  @ApiResponse({ status: 200, description: 'MFA отключено' })
  async disableMfa(@Req() req: { user: AuthUser }, @Body() dto: MfaDto) {
    return this.authService.disableMfa(req.user, dto.code);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выход из текущей сессии' })
  @ApiResponse({ status: 204, description: 'Успешный выход' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: { user: AuthUser }): Promise<void> {
    return this.authService.logout(req.user);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выход со всех устройств' })
  @ApiResponse({ status: 204, description: 'Все сессии отозваны' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@Req() req: { user: AuthUser }): Promise<void> {
    return this.authService.logoutAll(req.user);
  }
}
