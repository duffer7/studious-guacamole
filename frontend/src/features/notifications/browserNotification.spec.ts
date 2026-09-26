import { describe, expect, it } from 'vitest';
import {
  buildMessageNotification,
  previewMessageBody,
  shouldShowBrowserNotification,
} from '@features/notifications/browserNotification';
import type { ChatMember, ChatSummary, Message } from '@features/chats/types';

function message(patch: Partial<Message> = {}): Message {
  return {
    id: 1,
    chatId: 10,
    senderId: 2,
    body: 'Привет',
    type: 'text',
    clientMessageId: 'c1',
    replyToId: null,
    createdAt: '2026-09-26T00:00:00.000Z',
    ...patch,
  };
}

function member(id: number, displayName: string, username = `u${id}`): ChatMember {
  return {
    id,
    username,
    displayName,
    avatarUrl: null,
    role: 'member',
    joinedAt: '2026-09-01T00:00:00.000Z',
  };
}

function chat(patch: Partial<ChatSummary> = {}): ChatSummary {
  return {
    id: 10,
    type: 'direct',
    title: null,
    unreadCount: 0,
    lastReadMessageId: null,
    lastMessage: null,
    members: [member(1, 'Я'), member(2, 'Аня')],
    memberCount: 2,
    myRole: 'member',
    ...patch,
  };
}

describe('shouldShowBrowserNotification', () => {
  it('не показывает свои сообщения', () => {
    expect(
      shouldShowBrowserNotification({
        senderId: 1,
        currentUserId: 1,
        chatId: 10,
        activeChatId: 20,
        tabVisible: false,
      }),
    ).toBe(false);
  });

  it('не показывает, если пользователь смотрит этот чат', () => {
    expect(
      shouldShowBrowserNotification({
        senderId: 2,
        currentUserId: 1,
        chatId: 10,
        activeChatId: 10,
        tabVisible: true,
      }),
    ).toBe(false);
  });

  it('показывает, если вкладка скрыта, даже в том же чате', () => {
    expect(
      shouldShowBrowserNotification({
        senderId: 2,
        currentUserId: 1,
        chatId: 10,
        activeChatId: 10,
        tabVisible: false,
      }),
    ).toBe(true);
  });

  it('показывает, если открыт другой чат', () => {
    expect(
      shouldShowBrowserNotification({
        senderId: 2,
        currentUserId: 1,
        chatId: 10,
        activeChatId: 20,
        tabVisible: true,
      }),
    ).toBe(true);
  });
});

describe('previewMessageBody', () => {
  it('режет длинный текст и прячет имя файла', () => {
    expect(previewMessageBody({ type: 'file', body: null, attachmentName: 'photo.jpg' })).toBe(
      'photo.jpg',
    );
    expect(previewMessageBody({ type: 'text', body: '  ', attachmentName: null })).toBe(
      'Новое сообщение',
    );
    expect(previewMessageBody({ type: 'text', body: 'x'.repeat(141), attachmentName: null })).toBe(
      `${'x'.repeat(140)}…`,
    );
  });
});

describe('buildMessageNotification', () => {
  it('для личного чата берёт имя отправителя', () => {
    expect(buildMessageNotification(message(), [chat()], 1)).toEqual({
      title: 'Аня',
      body: 'Привет',
      tag: 'chat:10',
      chatId: 10,
    });
  });

  it('для группы пишет название чата и автора в теле', () => {
    expect(
      buildMessageNotification(
        message(),
        [chat({ type: 'group', title: 'Команда' })],
        1,
      ),
    ).toEqual({
      title: 'Команда',
      body: 'Аня: Привет',
      tag: 'chat:10',
      chatId: 10,
    });
  });
});
