import { Module } from '@nestjs/common';
import { ChatsService } from '@modules/chats/chats.service';
import { ChatsController } from './chats.controller';

@Module({
  controllers: [ChatsController],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatModule {}
