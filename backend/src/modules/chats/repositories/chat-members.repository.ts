import { type Database, DB } from '@db/db.provider';
import {
  type ChatMemberRow,
  type ChatRow,
  NewChatMemberRow,
  chatMembers,
  chats,
  users,
} from '@db/schema';
import type { Executor } from '@modules/chats/repositories/chats.repository';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

@Injectable()
export class ChatMembersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async createMany(
    data: NewChatMemberRow[],
    executor: Executor = this.db,
  ): Promise<ChatMemberRow[]> {
    return await executor.insert(chatMembers).values(data).returning();
  }

  /** Все членства пользователя вместе с соответствующим чатом. */
  async findByUserIdWithChats(
    userId: number,
  ): Promise<{ membership: ChatMemberRow; chat: ChatRow }[]> {
    const rows = await this.db
      .select({ membership: chatMembers, chat: chats })
      .from(chatMembers)
      .innerJoin(chats, eq(chatMembers.chatId, chats.id))
      .where(eq(chatMembers.userId, userId));

    return rows;
  }

  findByUserIdAndChatId(chatId: number, userId: number): Promise<ChatMemberRow | undefined> {
    return this.db.query.chatMembers.findFirst({
      where: and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)),
    });
  }

  /** Все участники чата вместе с публичными полями пользователя. */
  findMembersWithUsers(chatId: number) {
    return this.db
      .select({
        userId: chatMembers.userId,
        role: chatMembers.role,
        joinedAt: chatMembers.joinedAt,
        user: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(chatMembers)
      .innerJoin(users, eq(chatMembers.userId, users.id))
      .where(eq(chatMembers.chatId, chatId));
  }

  /** Уже существующие userId из списка, которые являются участниками чата. */
  async findExistingUserIds(chatId: number, userIds: number[]): Promise<number[]> {
    if (userIds.length === 0) return [];

    const rows = await this.db
      .select({ userId: chatMembers.userId })
      .from(chatMembers)
      .where(and(eq(chatMembers.chatId, chatId), inArray(chatMembers.userId, userIds)));

    return rows.map((r) => r.userId);
  }

  /** Все userId — участники чата (для рассылки WS-событий). */
  async findUserIds(chatId: number): Promise<number[]> {
    const rows = await this.db
      .select({ userId: chatMembers.userId })
      .from(chatMembers)
      .where(eq(chatMembers.chatId, chatId));

    return rows.map((r) => r.userId);
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
