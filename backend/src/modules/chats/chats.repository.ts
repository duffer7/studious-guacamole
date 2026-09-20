import { type Database, DB } from '@db/db.provider';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ChatsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  isMember(chatId: number, senderId: number): boolean {
    return false;
  }

  findByClientId(senderId: number, clientMessageId: number) {}
}
