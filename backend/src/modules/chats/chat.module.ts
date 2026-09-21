import { Module } from '@nestjs/common';
import { ChatsController } from '@modules/chats/dto/chats.controller';
import { ChatsService } from '@modules/chats/services/chats.service';
import { ChatsGateway } from '@modules/chats/gateways/chats.gateway';
import { ChatsRepository } from '@modules/chats/repositories/chats.repository';
import { ChatMembersRepository } from '@modules/chats/repositories/chat-members.repository';
import { MessagesRepository } from '@modules/chats/repositories/messages.repository';
import { PresenceService } from '@modules/chats/services/presence.service';

@Module({
  controllers: [ChatsController],
  providers: [
    ChatsService,
    ChatsGateway,
    PresenceService,
    ChatsRepository,
    ChatMembersRepository,
    MessagesRepository,
  ],
  exports: [ChatsService],
})
export class ChatModule {}
