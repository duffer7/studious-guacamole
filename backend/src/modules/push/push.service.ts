import { Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import webPush, { type PushSubscription, WebPushError } from 'web-push';
import type { UserRow } from '@db/schema';
import type { MessageDto } from '@modules/chats/dto/response/message.dto';
import { PushRepository } from '@modules/push/push.repository';
import type { PushPayload } from '@modules/push/push.payload';
import type { SubscribeDto } from '@modules/push/dto/subscribe.dto';

const PREVIEW_LIMIT = 140;

function previewText(message: MessageDto): string {
  if (message.type === 'file') {
    const name = message.attachmentName?.trim();
    return name || 'Файл';
  }
  const text = message.body?.trim() ?? '';
  if (!text) return 'Новое сообщение';
  return text.length > PREVIEW_LIMIT ? `${text.slice(0, PREVIEW_LIMIT)}…` : text;
}

function senderLabel(sender: UserRow): string {
  return sender.displayName?.trim() || sender.username;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private ready = false;
  private publicKey: string | null = null;

  constructor(private readonly repository: PushRepository) {}

  onModuleInit(): void {
    this.initVapid();
  }

  initVapid(): void {
    const enabled = process.env['PUSH_ENABLED'] === 'true';
    const publicKey = process.env['VAPID_PUBLIC_KEY']?.trim();
    const privateKey = process.env['VAPID_PRIVATE_KEY']?.trim();
    const subject = process.env['VAPID_SUBJECT']?.trim();

    if (!enabled || !publicKey || !privateKey || !subject) {
      this.ready = false;
      this.publicKey = null;
      this.logger.warn('Web Push is disabled (PUSH_ENABLED/VAPID_* missing)');
      return;
    }

    webPush.setVapidDetails(subject, publicKey, privateKey);
    this.publicKey = publicKey;
    this.ready = true;
  }

  getPublicKey(): string | null {
    return this.publicKey;
  }

  requireReady(): void {
    if (!this.ready || !this.publicKey) {
      throw new ServiceUnavailableException('Web Push is disabled');
    }
  }

  async subscribe(userId: number, dto: SubscribeDto, userAgent?: string): Promise<void> {
    this.requireReady();
    await this.repository.upsert({
      userId,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      userAgent: userAgent?.slice(0, 512) ?? null,
    });
  }

  async unsubscribe(userId: number, endpoint: string): Promise<void> {
    await this.repository.deleteByUserAndEndpoint(userId, endpoint);
  }

  buildMessagePayload(message: MessageDto, sender: UserRow, chatTitle: string): PushPayload {
    const from = senderLabel(sender);
    const preview = previewText(message);
    const group = chatTitle.trim().length > 0;
    return {
      type: 'message',
      title: group ? chatTitle.trim() : from,
      body: group ? `${from}: ${preview}` : preview,
      chatId: message.chatId,
      messageId: message.id,
      tag: `chat:${message.chatId}`,
      ts: Date.now(),
    };
  }

  buildCallPayload(callId: string, caller: UserRow, chatId: number): PushPayload {
    return {
      type: 'call',
      title: senderLabel(caller),
      body: 'Входящий звонок',
      chatId,
      callId,
      tag: `call:${callId}`,
      ts: Date.now(),
    };
  }

  buildMissedCallPayload(callId: string, caller: UserRow, chatId: number): PushPayload {
    return {
      type: 'missed-call',
      title: senderLabel(caller),
      body: 'Пропущенный звонок',
      chatId,
      callId,
      tag: `call:${callId}`,
      ts: Date.now(),
    };
  }

  buildCallDismissPayload(callId: string): PushPayload {
    return {
      type: 'call-dismiss',
      title: '',
      body: '',
      callId,
      tag: `call:${callId}`,
      ts: Date.now(),
    };
  }

  async sendToUsers(userIds: number[], payload: PushPayload): Promise<void> {
    if (!this.ready) return;
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return;

    const rows = await this.repository.findByUserIds(unique);
    await Promise.all(rows.map((row) => this.sendOne(row, payload)));
  }

  private async sendOne(
    row: { id: number; endpoint: string; p256dh: string; auth: string },
    payload: PushPayload,
  ): Promise<void> {
    const subscription: PushSubscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
    const urgency = payload.type === 'call' || payload.type === 'call-dismiss' ? 'high' : 'normal';
    const TTL = payload.type === 'call' ? 45 : payload.type === 'call-dismiss' ? 30 : 3600;

    try {
      await webPush.sendNotification(subscription, JSON.stringify(payload), { TTL, urgency });
      await this.repository.touch(row.id);
    } catch (err) {
      if (isGone(err)) {
        await this.repository.deleteById(row.id);
        this.logger.log(`Removed dead push subscription ${row.id}`);
        return;
      }
      this.logger.warn(`Push send failed for subscription ${row.id}: ${String(err)}`);
    }
  }
}

function isGone(err: unknown): boolean {
  const status =
    err instanceof WebPushError
      ? err.statusCode
      : err && typeof err === 'object' && 'statusCode' in err
        ? Number((err as { statusCode: unknown }).statusCode)
        : undefined;
  return status === 404 || status === 410;
}
