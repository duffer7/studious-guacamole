import { type Database, DB } from '@db/db.provider';
import { ChatRow, chats, NewChatRow } from '@db/schema';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

@Injectable()
export class ChatsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  findOneByDirectKey(directKey: string): Promise<ChatRow | undefined> {
    return this.db.query.chats.findFirst({ where: eq(chats.directKey, directKey) });
  }

  async createOne(chat: NewChatRow): Promise<ChatRow> {
    const [created] = await this.db.insert(chats).values(chat).returning();

    return created;
  }
}
