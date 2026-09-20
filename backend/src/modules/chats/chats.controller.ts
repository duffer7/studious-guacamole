// backend/src/modules/chats/chats.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/security/jwt-auth.guard';
import type { AuthUser } from '@modules/security/types';
import { ChatsService } from '@modules/chats/chats.service';
import { GetMessagesDto } from '@modules/chats/dto/request/get-message.dto';

@ApiTags('chats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  @ApiOperation({ summary: 'Список чатов текущего пользователя' })
  async list(@Req() req: { user: AuthUser }) {
    return this.chatsService.listChats(req.user.userId);
  }

  @Get(':chatId/messages')
  @ApiOperation({ summary: 'История сообщений чата (cursor-пагинация)' })
  async history(
    @Req() req: { user: AuthUser },
    @Param('chatId', ParseIntPipe) chatId: number,
    @Query() dto: GetMessagesDto,
  ) {
    return this.chatsService.getHistory(req.user.userId, chatId, dto.before, dto.limit ?? 50);
  }

  @Post(':chatId/read')
  @ApiOperation({ summary: 'Отметить чат прочитанным до messageId' })
  async read(
    @Req() req: { user: AuthUser },
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body('upToId', ParseIntPipe) upToId: number,
  ) {
    return this.chatsService.markRead(req.user.userId, chatId, upToId);
  }
}
