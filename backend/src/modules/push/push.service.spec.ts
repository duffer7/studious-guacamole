import { ServiceUnavailableException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import webPush from 'web-push';
import { PushService } from '@modules/push/push.service';
import type { MessageDto } from '@modules/chats/dto/response/message.dto';
import type { UserRow } from '@db/schema';

vi.mock('web-push', () => {
  return {
    default: {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn(),
    },
    WebPushError: class WebPushError extends Error {
      statusCode = 0;
    },
  };
});

function user(partial: Partial<UserRow> = {}): UserRow {
  return {
    id: 1,
    email: 'a@b.c',
    username: 'alice',
    password: 'x',
    displayName: 'Алиса',
    avatarUrl: null,
    mfaEnabled: false,
    mfaSecret: null,
    lastSeenAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

function message(partial: Partial<MessageDto> = {}): MessageDto {
  return {
    id: 10,
    chatId: 3,
    senderId: 1,
    body: 'привет мир',
    type: 'text',
    clientMessageId: '11111111-1111-1111-1111-111111111111',
    replyToId: null,
    createdAt: new Date().toISOString(),
    attachmentKey: null,
    attachmentName: null,
    attachmentMime: null,
    attachmentSize: null,
    ...partial,
  };
}

describe('PushService', () => {
  const repository = {
    upsert: vi.fn(),
    deleteByUserAndEndpoint: vi.fn(),
    findByUserIds: vi.fn(),
    deleteById: vi.fn(),
    touch: vi.fn(),
  };

  let service: PushService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['PUSH_ENABLED'] = 'true';
    process.env['VAPID_PUBLIC_KEY'] = 'public';
    process.env['VAPID_PRIVATE_KEY'] = 'private';
    process.env['VAPID_SUBJECT'] = 'mailto:admin@localhost';
    service = new PushService(repository as never);
    service.initVapid();
  });

  it('does not send when VAPID is disabled', async () => {
    process.env['PUSH_ENABLED'] = 'false';
    service.initVapid();
    expect(service.getPublicKey()).toBeNull();
    repository.findByUserIds.mockResolvedValue([
      { id: 1, endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' },
    ]);

    await service.sendToUsers([2], {
      type: 'message',
      title: 't',
      body: 'b',
      ts: 1,
    });

    expect(webPush.sendNotification).not.toHaveBeenCalled();
  });

  it('rejects subscribe when push is disabled', async () => {
    process.env['PUSH_ENABLED'] = 'false';
    service.initVapid();

    await expect(
      service.subscribe(1, {
        endpoint: 'https://push.example/1',
        keys: { p256dh: 'k'.repeat(10), auth: 'a'.repeat(8) },
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('builds a private message preview and truncates long text', () => {
    const long = 'я'.repeat(200);
    const payload = service.buildMessagePayload(message({ body: long }), user(), '');
    expect(payload.type).toBe('message');
    expect(payload.title).toBe('Алиса');
    expect(payload.body.endsWith('…')).toBe(true);
    expect(payload.body.length).toBeLessThanOrEqual(141);
    expect(payload.tag).toBe('chat:3');
    expect(payload.body).not.toContain('attachments/');
  });

  it('hides file contents and uses the file name', () => {
    const payload = service.buildMessagePayload(
      message({
        type: 'file',
        body: null,
        attachmentKey: 'attachments/3/secret',
        attachmentName: 'doc.pdf',
      }),
      user(),
      'Команда',
    );
    expect(payload.title).toBe('Команда');
    expect(payload.body).toBe('Алиса: doc.pdf');
    expect(payload.body).not.toContain('secret');
  });

  it('removes a subscription after 410 Gone', async () => {
    repository.findByUserIds.mockResolvedValue([
      { id: 7, endpoint: 'https://push.example/dead', p256dh: 'k', auth: 'a' },
    ]);
    vi.mocked(webPush.sendNotification).mockRejectedValueOnce({ statusCode: 410 });

    await service.sendToUsers([2], {
      type: 'message',
      title: 't',
      body: 'b',
      ts: 1,
    });

    expect(repository.deleteById).toHaveBeenCalledWith(7);
  });

  it('sends to every subscription of the listed users', async () => {
    repository.findByUserIds.mockResolvedValue([
      { id: 1, endpoint: 'https://push.example/a', p256dh: 'k', auth: 'a' },
      { id: 2, endpoint: 'https://push.example/b', p256dh: 'k', auth: 'a' },
    ]);
    vi.mocked(webPush.sendNotification).mockResolvedValue({} as never);

    await service.sendToUsers([4, 5], {
      type: 'call',
      title: 'Алиса',
      body: 'Входящий звонок',
      callId: 'c1',
      tag: 'call:c1',
      ts: 1,
    });

    expect(webPush.sendNotification).toHaveBeenCalledTimes(2);
    expect(repository.touch).toHaveBeenCalledTimes(2);
  });
});
