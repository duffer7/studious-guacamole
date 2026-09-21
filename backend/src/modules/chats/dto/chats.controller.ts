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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/security/jwt-auth.guard';
import type { AuthUser } from '@modules/security/types';
import { ChatsService } from '@modules/chats/services/chats.service';
import { GetMessagesDto } from '@modules/chats/dto/request/get-message.dto';
import { CreateDirectChatDto } from '@modules/chats/dto/request/create-direct-chat.dto';
import { CreateGroupChatDto } from '@modules/chats/dto/request/create-group-chat.dto';
import { AddMembersDto } from '@modules/chats/dto/request/add-member.dto';

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

  @Post('direct')
  @ApiOperation({ summary: 'Создать личный чат' })
  @ApiResponse({
    status: 201,
    description: 'Успешное создание личного чата',
  })
  async createDirect(@Req() req: { user: AuthUser }, @Body() body: CreateDirectChatDto) {
    return this.chatsService.createDirectChat(req.user.userId, body);
  }

  @Post('group')
  @ApiOperation({ summary: 'Создать групповой чат' })
  @ApiResponse({
    status: 201,
    description: 'Успешное создание группового чата',
  })
  async createGroup(@Req() req: { user: AuthUser }, @Body() body: CreateGroupChatDto) {
    return this.chatsService.createGroupChat(req.user.userId, body);
  }

  @Post(':chatId/members')
  @ApiOperation({ summary: 'Добавить участников в групповой чат' })
  @ApiResponse({
    status: 201,
    description: 'Успешное добавление участников в групповой чат',
  })
  async addMembers(@Param('chatId', ParseIntPipe) chatId: number, @Body() body: AddMembersDto) {
    return this.chatsService.addMembers(chatId, body);
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
