import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ChatsService } from '@modules/chats/services/chats.service';
import { ChatRole } from '@modules/chats/types/chat-role.enum';
import { ChatType } from '@modules/chats/types/chat-type.enum';

function member(partial: { userId: number; role: string; joinedAt?: Date }) {
  return {
    chatId: 1,
    userId: partial.userId,
    role: partial.role,
    lastReadMessageId: null,
    joinedAt: partial.joinedAt ?? new Date('2026-01-01T00:00:00.000Z'),
  };
}

function serviceWith(overrides: Record<string, unknown>) {
  const chatsGateway = {
    notifyMembersAdded: vi.fn(),
    notifyMemberRemoved: vi.fn(),
    notifyChatUpdated: vi.fn(),
    notifyChatCreated: vi.fn(),
  };
  const chatMembersRepository = {
    findByUserIdAndChatId: vi.fn(),
    findExistingUserIds: vi.fn().mockResolvedValue([]),
    createMany: vi.fn().mockResolvedValue([]),
    findMembersWithUsers: vi.fn().mockResolvedValue([]),
    deleteMember: vi.fn(),
    countMembers: vi.fn().mockResolvedValue(1),
    findEarliestOther: vi.fn(),
    updateRole: vi.fn(),
    findUserIds: vi.fn().mockResolvedValue([1]),
  };
  const chatsRepository = {
    findOneById: vi.fn(),
    updateTitle: vi.fn(),
    deleteOne: vi.fn(),
  };
  const usersService = {
    findByIds: vi.fn().mockImplementation(async (ids: number[]) => ids.map((id) => ({ id }))),
  };

  const service = new ChatsService(
    chatsGateway as never,
    {} as never,
    { ...chatsRepository, ...((overrides.chatsRepository as object) ?? {}) } as never,
    { ...chatMembersRepository, ...((overrides.chatMembersRepository as object) ?? {}) } as never,
    {} as never,
    { ...usersService, ...((overrides.usersService as object) ?? {}) } as never,
    { isOnlineMany: vi.fn().mockResolvedValue(new Map()) } as never,
    {
      sendToUsers: vi.fn().mockResolvedValue(undefined),
      buildMessagePayload: vi.fn().mockReturnValue({ type: 'message' }),
    } as never,
  );

  return { service, chatsGateway, chatMembersRepository, chatsRepository, usersService };
}

const group = { id: 1, type: ChatType.group, title: 'Команда' };

describe('ChatsService group membership', () => {
  it('rejects addMembers from a regular member', async () => {
    const { service, chatMembersRepository, chatsRepository } = serviceWith({});
    chatsRepository.findOneById.mockResolvedValue(group);
    chatMembersRepository.findByUserIdAndChatId.mockResolvedValue(
      member({ userId: 2, role: ChatRole.member }),
    );

    await expect(service.addMembers(1, 2, { targetUserIds: [3] })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects removing the owner', async () => {
    const { service, chatMembersRepository, chatsRepository } = serviceWith({});
    chatsRepository.findOneById.mockResolvedValue(group);
    chatMembersRepository.findByUserIdAndChatId.mockImplementation(
      async (_chatId: number, userId: number) =>
        userId === 1
          ? member({ userId: 1, role: ChatRole.owner })
          : member({ userId: 2, role: ChatRole.owner }),
    );

    await expect(service.removeMember(1, 1, 2)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects leave on a direct chat', async () => {
    const { service, chatsRepository } = serviceWith({});
    chatsRepository.findOneById.mockResolvedValue({ id: 1, type: ChatType.direct });

    await expect(service.leaveChat(1, 2)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('transfers ownership to the earliest remaining member', async () => {
    const { service, chatMembersRepository, chatsRepository, chatsGateway } = serviceWith({});
    chatsRepository.findOneById.mockResolvedValue(group);
    chatMembersRepository.findByUserIdAndChatId.mockResolvedValue(
      member({ userId: 1, role: ChatRole.owner }),
    );
    chatMembersRepository.findEarliestOther.mockResolvedValue(
      member({ userId: 4, role: ChatRole.member }),
    );
    chatMembersRepository.countMembers.mockResolvedValue(2);

    await service.leaveChat(1, 1);

    expect(chatMembersRepository.updateRole).toHaveBeenCalledWith(1, 4, ChatRole.owner);
    expect(chatMembersRepository.deleteMember).toHaveBeenCalledWith(1, 1);
    expect(chatsRepository.deleteOne).not.toHaveBeenCalled();
    expect(chatsGateway.notifyMemberRemoved).toHaveBeenCalledWith(1, 1);
  });

  it('rejects title change from a regular member', async () => {
    const { service, chatMembersRepository, chatsRepository } = serviceWith({});
    chatsRepository.findOneById.mockResolvedValue(group);
    chatMembersRepository.findByUserIdAndChatId.mockResolvedValue(
      member({ userId: 2, role: ChatRole.member }),
    );

    await expect(service.updateChat(1, 2, { title: 'Новое' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
