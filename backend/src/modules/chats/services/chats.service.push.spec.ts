import { describe, expect, it, vi } from 'vitest';
import { ChatsService } from '@modules/chats/services/chats.service';
import { ChatType } from '@modules/chats/types/chat-type.enum';
import type { MessageDto } from '@modules/chats/dto/response/message.dto';

function message(): MessageDto {
  return {
    id: 10,
    chatId: 3,
    senderId: 1,
    body: 'привет',
    type: 'text',
    clientMessageId: '11111111-1111-1111-1111-111111111111',
    replyToId: null,
    createdAt: new Date().toISOString(),
    attachmentKey: null,
    attachmentName: null,
    attachmentMime: null,
    attachmentSize: null,
  };
}

function serviceWith(presence: Map<number, boolean | null>) {
  const emit = vi.fn();
  const chatsGateway = { server: { to: vi.fn(() => ({ emit })) } };
  const messagesRepository = {
    findByClientId: vi.fn().mockResolvedValue(undefined),
    createOne: vi.fn().mockResolvedValue({
      ...message(),
      createdAt: new Date(message().createdAt),
    }),
  };
  const chatsRepository = {
    findOneById: vi.fn().mockResolvedValue({ id: 3, type: ChatType.direct, title: null }),
  };
  const chatMembersRepository = {
    findByUserIdAndChatId: vi.fn().mockResolvedValue({ userId: 1 }),
    findUserIds: vi.fn().mockResolvedValue([1, 2, 3]),
  };
  const usersService = {
    findById: vi.fn().mockResolvedValue({
      id: 1,
      username: 'alice',
      displayName: 'Алиса',
    }),
  };
  const presenceService = {
    isOnlineMany: vi.fn().mockResolvedValue(presence),
  };
  const payload = { type: 'message', title: 'Алиса', body: 'привет', tag: 'chat:3', ts: 1 };
  const pushService = {
    sendToUsers: vi.fn().mockResolvedValue(undefined),
    buildMessagePayload: vi.fn().mockReturnValue(payload),
  };

  const service = new ChatsService(
    chatsGateway as never,
    messagesRepository as never,
    chatsRepository as never,
    chatMembersRepository as never,
    {} as never,
    usersService as never,
    presenceService as never,
    pushService as never,
  );

  return { service, pushService, presenceService, messagesRepository };
}

describe('ChatsService message push', () => {
  it('does not push on idempotent resend', async () => {
    const { service, pushService, messagesRepository } = serviceWith(new Map([[2, false]]));
    messagesRepository.findByClientId.mockResolvedValue({
      ...message(),
      createdAt: new Date(message().createdAt),
    });
    const client = { emit: vi.fn() };

    await service.sendMessage(
      1,
      { chatId: 3, clientMessageId: message().clientMessageId, body: 'привет' },
      client as never,
    );

    await new Promise((resolve) => setImmediate(resolve));
    expect(pushService.sendToUsers).not.toHaveBeenCalled();
  });

  it('pushes only members who are offline (false), not unknown (null)', async () => {
    const { service, pushService } = serviceWith(
      new Map([
        [2, false],
        [3, null],
      ]),
    );
    const client = { emit: vi.fn() };

    await service.sendMessage(
      1,
      { chatId: 3, clientMessageId: message().clientMessageId, body: 'привет' },
      client as never,
    );
    await vi.waitFor(() => expect(pushService.sendToUsers).toHaveBeenCalled());

    expect(pushService.sendToUsers).toHaveBeenCalledWith([2], expect.objectContaining({ type: 'message' }));
  });

  it('skips push when every recipient is online', async () => {
    const { service, pushService } = serviceWith(
      new Map([
        [2, true],
        [3, true],
      ]),
    );
    const client = { emit: vi.fn() };

    await service.sendMessage(
      1,
      { chatId: 3, clientMessageId: message().clientMessageId, body: 'привет' },
      client as never,
    );
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(pushService.sendToUsers).not.toHaveBeenCalled();
  });
});
