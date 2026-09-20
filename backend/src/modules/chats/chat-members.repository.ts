import { type Database, DB } from '@db/db.provider';
import { type ChatMemberRow, type ChatMemberWithСhats, chatMembers } from '@db/schema';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

@Injectable()
export class ChatMembersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  isMember(chatId: number, senderId: number): boolean {
    return false;
  }

  findByUserId(userId: number): Promise<ChatMemberWithСhats | undefined> {
    return this.db.query.chatMembers.findFirst({
      where: eq(chatMembers.userId, userId),
      with: {
        chats: true,
      },
    });
  }

  async updateLastReadMessageId(
    userId: number,
    chatId: number,
    lastReadMessageId: number,
  ): Promise<ChatMemberRow> {
    const [updated] = await this.db
      .update(chatMembers)
      .set({ lastReadMessageId: lastReadMessageId })
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
      .returning();

    return updated;
  }
}
