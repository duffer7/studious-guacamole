import { type Database, DB } from '@db/db.provider';
import { MessageRow, messages, NewMessageRow } from '@db/schema';
import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, gt, isNull, lt, ne } from 'drizzle-orm';

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

  /** Количество непрочитанных сообщений (id > lastReadMessageId, автор — не сам пользователь). */
  async countUnread(
    chatId: number,
    userId: number,
    lastReadMessageId: number | null,
  ): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(messages)
      .where(
        and(
          eq(messages.chatId, chatId),
          ne(messages.senderId, userId),
          isNull(messages.deletedAt),
          lastReadMessageId ? gt(messages.id, lastReadMessageId) : undefined,
        ),
      );

    return Number(row?.value ?? 0);
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
