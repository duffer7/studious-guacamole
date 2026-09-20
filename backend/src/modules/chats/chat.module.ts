import { Module } from '@nestjs/common';
import { ChatsController } from '@modules/chats/chats.controller';
import { ChatsService } from '@modules/chats/chats.service';
import { ChatsGateway } from '@modules/chats/chats.gateway';
import { ChatsRepository } from '@modules/chats/chats.repository';
import { ChatMembersRepository } from '@modules/chats/chat-members.repository';
import { MessagesRepository } from '@modules/chats/messages.repository';
import { PresenceService } from '@modules/chats/presence.service';

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
