import { type Database, DB } from '@db/db.provider';
import { MessageRow, messages, NewMessageRow } from '@db/schema';
import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, isNull, lt } from 'drizzle-orm';

@Injectable()
export class MessagesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  findHistory(chatId: number, before: number | undefined, limit = 50) {
    return this.db.query.messages.findMany({
      where: and(
        eq(messages.chatId, chatId),
        before ? lt(messages.id, before) : undefined,
        isNull(messages.deletedAt),
      ),
      orderBy: desc(messages.id),
      limit,
    });
  }

  findByClientId(senderId: number, clientMessageId: string): Promise<MessageRow | undefined> {
    return this.db.query.messages.findFirst({
      where: and(eq(messages.senderId, senderId), eq(messages.clientMessageId, clientMessageId)),
    });
  }

  async createOne(data: NewMessageRow): Promise<MessageRow> {
    const [created] = await this.db.insert(messages).values(data).returning();

    return created;
  }
}
