import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { ChatMemberRow, MessageRow, NewChatMemberRow, NewChatRow } from '@db/schema';
import { ChatsGateway } from '@modules/chats/gateways/chats.gateway';
import { MessagesRepository } from '@modules/chats/repositories/messages.repository';
import { ChatsRepository } from '@modules/chats/repositories/chats.repository';
import { ChatMembersRepository } from '@modules/chats/repositories/chat-members.repository';
import { SendMessageDto } from '@modules/chats/dto/request/send-message.dto';
import { ChatSummaryDto } from '@modules/chats/dto/response/chat-summary.dto';
import { MessageDto } from '@modules/chats/dto/response/message.dto';
import { CreateDirectChatDto } from '@modules/chats/dto/request/create-direct-chat.dto';
import { ChatType } from '@modules/chats/types/chat-type.enum';
import { CreateGroupChatDto } from '@modules/chats/dto/request/create-group-chat.dto';
import { AddMembersDto } from '@modules/chats/dto/request/add-member.dto';
import { PublicUserDto } from '@modules/user/dto/public-user.dto';

@Injectable()
export class ChatsService {
  constructor(
    @Inject(forwardRef(() => ChatsGateway))
    readonly chatsGateway: ChatsGateway,
    readonly messagesRepository: MessagesRepository,
    readonly chatsRepository: ChatsRepository,
    readonly chatMembersRepository: ChatMembersRepository,
  ) {}

  async getChatIdsByMemberId(userId: number): Promise<number[] | undefined> {
    const memberships = await this.chatMembersRepository.findByUserIdWithChats(userId);

    return memberships?.map((m) => m.chat.id);
  }

  async createDirectChat(userId: number, body: CreateDirectChatDto): Promise<NewChatRow> {
    const { targetUserId } = body;

    if (targetUserId === userId) {
      throw new BadRequestException('cannot create direct chat with yourself');
    }

    const [a, b] = [userId, targetUserId].sort((x, y) => x - y);
    const directKey = `${a}:${b}`;

    const existing = await this.chatsRepository.findOneByDirectKey(directKey);
    if (existing) {
      return existing;
    }

    const createdChat = await this.chatsRepository.transaction(async (tx) => {
      const chat = await this.chatsRepository.createOne(
        { createdBy: userId, type: ChatType.direct, directKey },
        tx,
      );

      await this.chatMembersRepository.createMany(
        [
          { chatId: chat.id, userId },
          { chatId: chat.id, userId: targetUserId },
        ],
        tx,
      );

      return chat;
    });

    const summary = await this.getChat(userId, createdChat.id);
    await this.chatsGateway.notifyChatCreated(createdChat.id, summary, [userId, targetUserId]);

    return createdChat;
  }

  async createGroupChat(userId: number, body: CreateGroupChatDto): Promise<NewChatRow> {
    const { targetUserIds, title } = body;

    // создатель + уникальные участники, без дублей
    const memberIds = [...new Set([userId, ...targetUserIds])];

    const createdChat = await this.chatsRepository.transaction(async (tx) => {
      const chat = await this.chatsRepository.createOne(
        { title, createdBy: userId, type: ChatType.group },
        tx,
      );

      await this.chatMembersRepository.createMany(
        memberIds.map((id) => ({
          chatId: chat.id,
          userId: id,
          role: id === userId ? 'owner' : 'member',
        })),
        tx,
      );

      return chat;
    });

    const summary = await this.getChat(userId, createdChat.id);
    await this.chatsGateway.notifyChatCreated(createdChat.id, summary, memberIds);

    return createdChat;
  }

  async addMembers(
    chatId: number,
    actorId: number,
    dto: AddMembersDto,
  ): Promise<NewChatMemberRow[]> {
    const chat = await this.chatsRepository.findOneById(chatId);
    if (!chat) {
      throw new NotFoundException('chat not found');
    }

    const actor = await this.chatMembersRepository.findByUserIdAndChatId(chatId, actorId);
    if (!actor) {
      throw new ForbiddenException('forbidden');
    }

    if (chat.type === ChatType.direct) {
      throw new BadRequestException('cannot add members to a direct chat');
    }

    const { targetUserIds } = dto;
    const existing = await this.chatMembersRepository.findExistingUserIds(chatId, targetUserIds);

    const toAdd: NewChatMemberRow[] = targetUserIds
      .filter((id) => !existing.includes(id))
      .map((id) => ({ chatId, userId: id }));

    if (toAdd.length === 0) return [];

    const created = await this.chatMembersRepository.createMany(toAdd);
    await this.chatsGateway.notifyMembersAdded(
      chatId,
      toAdd.map((m) => m.userId),
    );

    return created;
  }

  async markRead(
    userId: number,
    chatId: number,
    lastReadMessageId: number,
  ): Promise<ChatMemberRow> {
    return await this.chatMembersRepository.updateLastReadMessageId(
      userId,
      chatId,
      lastReadMessageId,
    );
  }

  async sendMessage(senderId: number, dto: SendMessageDto, client: Socket) {
    // Проверка что пользователь член чата
    const chatMember = await this.chatMembersRepository.findByUserIdAndChatId(dto.chatId, senderId);
    if (!chatMember) {
      throw new WsException('forbidden');
    }

    // Проверка на идемпотентность (если сообщение уже отправили ранее)
    const existing = await this.messagesRepository.findByClientId(senderId, dto.clientMessageId);
    if (existing) {
      const existingDto = this.toMessageDto(existing);
      // ack только отправителю (получатели уже видели это через message:new ранее)
      client.emit('message:ack', existingDto);
      return existingDto;
    }

    const message = await this.messagesRepository.createOne({
      chatId: dto.chatId,
      senderId,
      body: dto.body,
      clientMessageId: dto.clientMessageId,
      replyToId: dto.replyToId,
    });

    const messageDto = this.toMessageDto(message);

    this.chatsGateway.server.to(`user:${senderId}`).emit('message:ack', messageDto);

    // Доставляем всем участникам чата напрямую в их пользовательские комнаты.
    // Это не зависит от того, собраны ли комнаты chat:{id} к моменту отправки
    // (сокет мог подключиться раньше, чем пользователь вошёл в чат).
    const memberIds = await this.chatMembersRepository.findUserIds(dto.chatId);
    for (const memberId of memberIds) {
      if (memberId === senderId) continue;
      this.chatsGateway.server.to(`user:${memberId}`).emit('message:new', messageDto);
    }

    // await this.push.notifyOfflineMembers(dto.chatId, senderId, message);

    return messageDto;
  }

  private toMessageDto(m: MessageRow): MessageDto {
    return {
      id: m.id,
      chatId: m.chatId,
      senderId: m.senderId,
      body: m.body,
      type: m.type,
      clientMessageId: m.clientMessageId,
      replyToId: m.replyToId,
      createdAt: m.createdAt.toISOString(),
    };
  }

  private toPublicUser(user: {
    id: number;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  }): PublicUserDto {
    return new PublicUserDto(user);
  }

  async listChats(userId: number): Promise<ChatSummaryDto[]> {
    const memberships = await this.chatMembersRepository.findByUserIdWithChats(userId);
    if (!memberships || memberships.length === 0) return [];

    const result: ChatSummaryDto[] = [];
    for (const { membership, chat } of memberships) {
      const [lastMessage] = await this.messagesRepository.findHistory(chat.id, undefined, 1);
      const members = await this.chatMembersRepository.findMembersWithUsers(chat.id);
      const unreadCount = await this.messagesRepository.countUnread(
        chat.id,
        userId,
        membership.lastReadMessageId,
      );

      result.push({
        id: chat.id,
        type: chat.type,
        title: chat.title,
        unreadCount,
        lastMessage: lastMessage ? this.toMessageDto(lastMessage) : null,
        members: members.map((m) => this.toPublicUser(m.user)),
      });
    }

    // свежие чаты сверху
    result.sort((a, b) => {
      const at = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : 0;
      const bt = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : 0;
      return bt - at;
    });

    return result;
  }

  async getChat(userId: number, chatId: number): Promise<ChatSummaryDto> {
    const membership = await this.chatMembersRepository.findByUserIdAndChatId(chatId, userId);
    if (!membership) {
      throw new ForbiddenException('forbidden');
    }

    const chat = await this.chatsRepository.findOneById(chatId);
    if (!chat) {
      throw new NotFoundException('chat not found');
    }

    const [lastMessage] = await this.messagesRepository.findHistory(chatId, undefined, 1);
    const members = await this.chatMembersRepository.findMembersWithUsers(chatId);
    const unreadCount = await this.messagesRepository.countUnread(
      chatId,
      userId,
      membership.lastReadMessageId,
    );

    return {
      id: chat.id,
      type: chat.type,
      title: chat.title,
      unreadCount,
      lastMessage: lastMessage ? this.toMessageDto(lastMessage) : null,
      members: members.map((m) => this.toPublicUser(m.user)),
    };
  }

  async getMembers(userId: number, chatId: number): Promise<PublicUserDto[]> {
    const membership = await this.chatMembersRepository.findByUserIdAndChatId(chatId, userId);
    if (!membership) {
      throw new ForbiddenException('forbidden');
    }

    const members = await this.chatMembersRepository.findMembersWithUsers(chatId);
    return members.map((m) => this.toPublicUser(m.user));
  }

  async getHistory(userId: number, chatId: number, before: number | undefined, limit: number) {
    const member = await this.chatMembersRepository.findByUserIdAndChatId(chatId, userId);
    if (!member) {
      throw new ForbiddenException('forbidden');
    }

    const rows = await this.messagesRepository.findHistory(chatId, before, limit + 1);
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: page.map((m) => this.toMessageDto(m)).reverse(),
      hasMore,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }
}
