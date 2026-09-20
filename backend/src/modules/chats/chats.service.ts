import { Injectable } from '@nestjs/common';
import { ChatsGateway } from '@modules/chats/chats.gateway';
import { WsException } from '@nestjs/websockets';
import { MembersRepository } from './members.repository';
import { MessagesRepository } from './messages.repository';
import { ChatsRepository } from './chats.repository';
import { ChatMembersRepository } from './chat-members.repository';
import { ChatMemberRow } from '@db/schema';
import { Socket } from 'socket.io';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatsService {
  constructor(
    readonly chatsGateway: ChatsGateway,
    readonly membersRepository: MembersRepository,
    readonly messagesRepository: MessagesRepository,
    readonly chatsRepository: ChatsRepository,
    readonly chatMembersRepository: ChatMembersRepository,
  ) {}

  async getChatIdsByMemberId(userId: number): Promise<number[] | undefined> {
    const chatsMember = await this.chatMembersRepository.findByUserId(userId);

    return chatsMember?.chats.map((chat) => chat.id);
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
    if (!(await this.membersRepository.isMember(dto.chatId, senderId))) {
      throw new WsException('forbidden');
    }

    // Проверка на идемпотентность (если сообщение уже отправили ранее)
    const existing = await this.messagesRepository.findByClientId(senderId, dto.clientMessageId);
    if (existing) {
      client.emit('message:ack', existing);
      return;
    }

    const msg = await this.messagesRepository.createOne({
      chatId: dto.chatId,
      senderId,
      body: dto.body,
      clientMessageId: dto.clientMessageId,
      replyToId: dto.replyToId,
    });

    this.chatsGateway.server.to(`user:${senderId}`).emit('message:ack', msg);
    this.chatsGateway.server.to(`chat:${dto.chatId}`).emit('message:new', msg);

    // await this.push.notifyOfflineMembers(dto.chatId, senderId, msg);

    return msg;
  }
}
