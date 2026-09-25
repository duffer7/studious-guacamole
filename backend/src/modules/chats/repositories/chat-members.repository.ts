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
import { and, asc, count, eq, inArray, ne } from 'drizzle-orm';

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

  async deleteMember(chatId: number, userId: number): Promise<void> {
    await this.db
      .delete(chatMembers)
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
  }

  async countMembers(chatId: number): Promise<number> {
    const [row] = await this.db
      .select({ value: count() })
      .from(chatMembers)
      .where(eq(chatMembers.chatId, chatId));
    return Number(row?.value ?? 0);
  }

  findOwner(chatId: number): Promise<ChatMemberRow | undefined> {
    return this.db.query.chatMembers.findFirst({
      where: and(eq(chatMembers.chatId, chatId), eq(chatMembers.role, 'owner')),
    });
  }

  /** Самый ранний участник, кроме указанного — кандидат на передачу owner. */
  async findEarliestOther(
    chatId: number,
    excludeUserId: number,
  ): Promise<ChatMemberRow | undefined> {
    const [row] = await this.db
      .select()
      .from(chatMembers)
      .where(and(eq(chatMembers.chatId, chatId), ne(chatMembers.userId, excludeUserId)))
      .orderBy(asc(chatMembers.joinedAt), asc(chatMembers.userId))
      .limit(1);
    return row;
  }

  async updateRole(chatId: number, userId: number, role: string): Promise<ChatMemberRow> {
    const [updated] = await this.db
      .update(chatMembers)
      .set({ role })
      .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
      .returning();
    return updated;
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
