import { Inject, Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';
import { DB, type Database } from '@db/db.provider';
import { pushSubscriptions, type PushSubscriptionRow } from '@db/schema';

@Injectable()
export class PushRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async upsert(input: {
    userId: number;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
  }): Promise<PushSubscriptionRow> {
    const [row] = await this.db
      .insert(pushSubscriptions)
      .values({
        userId: input.userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
        lastUsedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: input.userId,
          p256dh: input.p256dh,
          auth: input.auth,
          userAgent: input.userAgent ?? null,
          lastUsedAt: new Date(),
        },
      })
      .returning();
    return row;
  }

  async deleteByUserAndEndpoint(userId: number, endpoint: string): Promise<void> {
    await this.db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
  }

  async findByUserIds(userIds: number[]): Promise<PushSubscriptionRow[]> {
    if (userIds.length === 0) return [];
    return this.db.query.pushSubscriptions.findMany({
      where: inArray(pushSubscriptions.userId, userIds),
    });
  }

  async deleteById(id: number): Promise<void> {
    await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, id));
  }

  async touch(id: number): Promise<void> {
    await this.db
      .update(pushSubscriptions)
      .set({ lastUsedAt: new Date() })
      .where(eq(pushSubscriptions.id, id));
  }
}
