import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { type Database, DB } from '@db/db.provider';
import { ChatRow, chats, NewChatRow } from '@db/schema';

/**
 * Исполнитель запросов — сам клиент БД или транзакция.
 * Транзакция (`NodePgTransaction`) структурно совместима с нужными нам методами,
 * поэтому на входе приводится к этому типу.
 */
export type Executor = Database;

@Injectable()
export class ChatsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Запускает колбэк в транзакции. */
  transaction<T>(fn: (tx: Executor) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => fn(tx as unknown as Executor));
  }

  findOneByDirectKey(
    directKey: string,
    executor: Executor = this.db,
  ): Promise<ChatRow | undefined> {
    return executor.query.chats.findFirst({ where: eq(chats.directKey, directKey) });
  }

  findOneById(id: number): Promise<ChatRow | undefined> {
    return this.db.query.chats.findFirst({ where: eq(chats.id, id) });
  }

  async createOne(chat: NewChatRow, executor: Executor = this.db): Promise<ChatRow> {
    const [created] = await executor.insert(chats).values(chat).returning();

    return created;
  }
}
