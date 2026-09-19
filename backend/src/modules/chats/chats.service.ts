import { Injectable } from '@nestjs/common';
import { ChatsGateway } from '@modules/chats/chats.gateway';
import { WsException } from '@nestjs/websockets';
import { MembersRepository } from './members.repository';
import { MessagesRepository } from './messages.repository';

@Injectable()
export class ChatsService {
  constructor(
    readonly chatsGateway: ChatsGateway,
    readonly membersRepository: MembersRepository,
    readonly messagesRepository: MessagesRepository,
  ) {}

  async getConversationIds() {
    return [1, 2, 3];
  }

  async markRead() {}

  // async sendMessage(senderId: number, dto: SendMessageDto, client: Socket) {
  //   // 1. авторизация — член чата?
  //   if (!(await this.membersRepository.isMember(dto.chatId, senderId))) {
  //     throw new WsException('forbidden');
  //   }

  //   // 2. идемпотентность: если (senderId, clientMessageId) уже есть — вернуть существующее
  //   const existing = await this.messagesRepository.findByClientId(senderId, dto.clientMessageId);
  //   if (existing) {
  //     client.emit('message:ack', existing);
  //     return;
  //   }

  //   // 3. вставка (unique-индекс ловит гонку при параллельных retry)
  //   const msg = await this.messagesRepository.insertWithConversationTouch({
  //     chatId: dto.chatId,
  //     senderId,
  //     body: dto.body,
  //     clientMessageId: dto.clientMessageId,
  //     replyToId: dto.replyToId,
  //   });

  //   // 4. ack отправителю (все его устройства — комната user:)
  //   this.chatsGateway.server.to(`user:${senderId}`).emit('message:ack', msg);

  //   // 5. новое сообщение — всем в комнате чата
  //   this.chatsGateway.server.to(`conv:${dto.chatId}`).emit('message:new', msg);

  //   // 6. offline-получателям — пуш (в отдельной очереди/сервисе)
  //   await this.push.notifyOfflineMembers(dto.chatId, senderId, msg);

  //   return msg;
  // }
}
