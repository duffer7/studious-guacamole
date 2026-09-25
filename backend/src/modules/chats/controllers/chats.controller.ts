import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
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
import { UpdateChatDto } from '@modules/chats/dto/request/update-chat.dto';
import { UploadAttachmentDto } from '@modules/chats/dto/request/upload-attachment.dto';

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

  @Get(':chatId')
  @ApiOperation({ summary: 'Информация о чате' })
  async getOne(@Req() req: { user: AuthUser }, @Param('chatId', ParseIntPipe) chatId: number) {
    return this.chatsService.getChat(req.user.userId, chatId);
  }

  @Get(':chatId/members')
  @ApiOperation({ summary: 'Участники чата' })
  async members(@Req() req: { user: AuthUser }, @Param('chatId', ParseIntPipe) chatId: number) {
    return this.chatsService.getMembers(req.user.userId, chatId);
  }

  @Post(':chatId/members')
  @ApiOperation({ summary: 'Добавить участников в групповой чат' })
  @ApiResponse({
    status: 201,
    description: 'Успешное добавление участников в групповой чат',
  })
  async addMembers(
    @Req() req: { user: AuthUser },
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: AddMembersDto,
  ) {
    return this.chatsService.addMembers(chatId, req.user.userId, body);
  }

  @Patch(':chatId')
  @ApiOperation({ summary: 'Переименовать групповой чат' })
  update(
    @Req() req: { user: AuthUser },
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: UpdateChatDto,
  ) {
    return this.chatsService.updateChat(chatId, req.user.userId, body);
  }

  @Delete(':chatId/members/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Удалить участника из группового чата' })
  removeMember(
    @Req() req: { user: AuthUser },
    @Param('chatId', ParseIntPipe) chatId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.chatsService.removeMember(chatId, req.user.userId, userId);
  }

  @Post(':chatId/leave')
  @HttpCode(204)
  @ApiOperation({ summary: 'Выйти из группового чата' })
  leave(@Req() req: { user: AuthUser }, @Param('chatId', ParseIntPipe) chatId: number) {
    return this.chatsService.leaveChat(chatId, req.user.userId);
  }

  @Post(':chatId/files')
  @ApiOperation({ summary: 'Загрузить вложение в MinIO' })
  uploadFile(
    @Req() req: { user: AuthUser },
    @Param('chatId', ParseIntPipe) chatId: number,
    @Body() body: UploadAttachmentDto,
  ) {
    return this.chatsService.uploadAttachment(req.user.userId, chatId, body);
  }

  @Get(':chatId/files/:file')
  @ApiOperation({ summary: 'Скачать вложение, если пользователь в чате' })
  async downloadFile(
    @Req() req: { user: AuthUser },
    @Param('chatId', ParseIntPipe) chatId: number,
    @Param('file') file: string,
  ) {
    const stored = await this.chatsService.readAttachment(req.user.userId, chatId, file);
    return new StreamableFile(stored.body, {
      type: stored.contentType,
      disposition: `inline; filename="${stored.name}"`,
    });
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
