import { ForbiddenException, Injectable } from '@nestjs/common';
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

@Injectable()
export class ChatsService {
  constructor(
    readonly chatsGateway: ChatsGateway,
    readonly messagesRepository: MessagesRepository,
    readonly chatsRepository: ChatsRepository,
    readonly chatMembersRepository: ChatMembersRepository,
  ) {}

  async getChatIdsByMemberId(userId: number): Promise<number[] | undefined> {
    const chatsMember = await this.chatMembersRepository.findByUserIdWithChats(userId);

    return chatsMember?.chats.map((chat) => chat.id);
  }

  async createDirectChat(userId: number, body: CreateDirectChatDto): Promise<NewChatRow> {
    // make transactional
    const { targetUserId } = body;

    const [a, b] = [userId, targetUserId].sort((x, y) => x - y);
    const directKey = `${a}:${b}`;

    const existing = await this.chatsRepository.findOneByDirectKey(directKey);
    if (existing) {
      return existing;
    }

    const newChat: NewChatRow = { createdBy: userId, type: ChatType.direct, directKey: directKey };

    const createdChat = await this.chatsRepository.createOne(newChat);

    const newSenderChatMember: NewChatMemberRow = { chatId: createdChat.id, userId: userId };
    const newTargetChatMember: NewChatMemberRow = { chatId: createdChat.id, userId: targetUserId };
    await this.chatMembersRepository.createMany([newSenderChatMember, newTargetChatMember]);

    return createdChat;
  }

  async createGroupChat(userId: number, body: CreateGroupChatDto): Promise<NewChatRow> {
    // make transactional
    const { targetUserIds, title } = body;

    const newChat: NewChatRow = { title: title, createdBy: userId, type: ChatType.group };
    const createdChat = await this.chatsRepository.createOne(newChat);

    const newSenderChatMember: NewChatMemberRow = { chatId: createdChat.id, userId: userId };
    const newTargetChatMembers: NewChatMemberRow[] = targetUserIds.map((item) => ({
      chatId: createdChat.id,
      userId: item,
    }));
    await this.chatMembersRepository.createMany([newSenderChatMember, ...newTargetChatMembers]);

    return createdChat;
  }

  async addMembers(chatId: number, dto: AddMembersDto): Promise<NewChatMemberRow[]> {
    const { targetUserIds } = dto;
    const newTargetChatMembers: NewChatMemberRow[] = targetUserIds.map((item) => ({
      chatId: chatId,
      userId: item,
    }));
    const createdMembers = await this.chatMembersRepository.createMany(newTargetChatMembers);

    return createdMembers;
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
      client.emit('message:ack', existing);
      return;
    }

    const message = await this.messagesRepository.createOne({
      chatId: dto.chatId,
      senderId,
      body: dto.body,
      clientMessageId: dto.clientMessageId,
      replyToId: dto.replyToId,
    });

    this.chatsGateway.server.to(`user:${senderId}`).emit('message:ack', message);
    this.chatsGateway.server.to(`chat:${dto.chatId}`).emit('message:new', message);

    // await this.push.notifyOfflineMembers(dto.chatId, senderId, msmessageg);

    return message;
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

  async listChats(userId: number): Promise<ChatSummaryDto[]> {
    const chatsMember = await this.chatMembersRepository.findByUserIdWithChats(userId);
    const chatIds = chatsMember?.chats.map((c) => c.id) ?? [];
    if (chatIds.length === 0) return [];

    const result: ChatSummaryDto[] = [];
    for (const chat of chatsMember!.chats) {
      const [lastMessage] = await this.messagesRepository.findHistory(chat.id, undefined, 1);
      result.push({
        id: chat.id,
        type: chat.type,
        title: chat.title,
        unreadCount: 0, // TODO: count(id > lastReadMessageId)
        lastMessage: lastMessage ? this.toMessageDto(lastMessage) : null,
        members: [], // TODO: участники
      });
    }
    return result;
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
