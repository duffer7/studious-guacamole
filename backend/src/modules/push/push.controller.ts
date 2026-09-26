import { Body, Controller, Get, Headers, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/security/jwt-auth.guard';
import { RateLimit } from '@modules/security/rate-limit.decorator';
import { RateLimitInterceptor } from '@modules/security/rate-limit.interceptor';
import type { AuthUser } from '@modules/security/types';
import { PushService } from '@modules/push/push.service';
import { SubscribeDto } from '@modules/push/dto/subscribe.dto';
import { UnsubscribeDto } from '@modules/push/dto/unsubscribe.dto';

@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('public-key')
  @ApiOperation({ summary: 'Публичный VAPID-ключ для PushManager.subscribe' })
  @ApiOkResponse({ schema: { properties: { publicKey: { type: 'string', nullable: true } } } })
  getPublicKey(): { publicKey: string | null } {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RateLimit({ bucket: 'push-subscribe', limit: 30, window: 60 })
  @UseInterceptors(RateLimitInterceptor)
  @ApiOperation({ summary: 'Сохранить Web Push-подписку текущего пользователя' })
  async subscribe(
    @Req() req: { user: AuthUser },
    @Body() dto: SubscribeDto,
    @Headers('user-agent') userAgent?: string,
  ): Promise<{ ok: true }> {
    await this.pushService.subscribe(req.user.userId, dto, userAgent);
    return { ok: true };
  }

  @Post('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @RateLimit({ bucket: 'push-unsubscribe', limit: 30, window: 60 })
  @UseInterceptors(RateLimitInterceptor)
  @ApiOperation({ summary: 'Удалить Web Push-подписку текущего пользователя' })
  async unsubscribe(
    @Req() req: { user: AuthUser },
    @Body() dto: UnsubscribeDto,
  ): Promise<{ ok: true }> {
    await this.pushService.unsubscribe(req.user.userId, dto.endpoint);
    return { ok: true };
  }
}
