import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { randomUUID } from 'crypto';
import { ChatsRepository } from '@modules/chats/repositories/chats.repository';
import { ChatMembersRepository } from '@modules/chats/repositories/chat-members.repository';
import { ChatType } from '@modules/chats/types/chat-type.enum';

export interface SessionDescription {
  type: 'offer' | 'answer';
  sdp?: string;
}

export interface IceCandidatePayload {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface CallSession {
  id: string;
  chatId: number;
  callerId: number;
  calleeId: number;
  state: 'ringing' | 'active';
}

const RING_MS = 45_000;

/**
 * Сигналинг 1:1 WebRTC. Медиа идёт напрямую между браузерами;
 * здесь только проверка членства и доставка SDP/ICE нужному собеседнику.
 * Состояние живёт в памяти процесса — так же, как комнаты socket.io без Redis-адаптера.
 */
@Injectable()
export class CallsService {
  private readonly byId = new Map<string, CallSession>();
  private readonly byUser = new Map<number, string>();
  private readonly timers = new Map<string, NodeJS.Timeout>();

  /** Вызывается, когда звонок умирает без участия сокета (таймаут гудков). */
  onEnded?: (session: CallSession, reason: 'timeout') => void;

  constructor(
    private readonly chatsRepository: ChatsRepository,
    private readonly membersRepository: ChatMembersRepository,
  ) {}

  async invite(callerId: number, chatId: number): Promise<CallSession> {
    if (this.byUser.has(callerId)) {
      throw new WsException('busy');
    }

    const chat = await this.chatsRepository.findOneById(chatId);
    if (!chat) throw new WsException('chat not found');
    if (chat.type !== ChatType.direct) {
      throw new WsException('video calls are only available in direct chats');
    }

    const memberIds = await this.membersRepository.findUserIds(chatId);
    if (!memberIds.includes(callerId)) throw new WsException('forbidden');

    const calleeId = memberIds.find((id) => id !== callerId);
    if (!calleeId) throw new WsException('peer not found');
    if (this.byUser.has(calleeId)) throw new WsException('busy');

    const session: CallSession = {
      id: randomUUID(),
      chatId,
      callerId,
      calleeId,
      state: 'ringing',
    };

    this.track(session);
    this.timers.set(
      session.id,
      setTimeout(() => {
        const current = this.byId.get(session.id);
        if (!current || current.state !== 'ringing') return;
        this.drop(current);
        this.onEnded?.(current, 'timeout');
      }, RING_MS),
    );

    return session;
  }

  accept(userId: number, callId: string): CallSession {
    const session = this.requireParticipant(userId, callId);
    if (session.calleeId !== userId) throw new WsException('forbidden');
    if (session.state !== 'ringing') throw new WsException('call is not ringing');

    session.state = 'active';
    this.clearTimer(session.id);
    return session;
  }

  reject(userId: number, callId: string): CallSession {
    const session = this.requireParticipant(userId, callId);
    if (session.state !== 'ringing') throw new WsException('call is not ringing');
    this.drop(session);
    return session;
  }

  relayDescription(
    userId: number,
    callId: string,
    description: SessionDescription,
  ): { session: CallSession; toUserId: number } {
    const session = this.requireParticipant(userId, callId);
    if (session.state !== 'active') throw new WsException('call is not active');
    if (description.type !== 'offer' && description.type !== 'answer') {
      throw new WsException('bad description');
    }
    if (!description.sdp || description.sdp.length > 16_000) {
      throw new WsException('bad description');
    }
    return { session, toUserId: this.peerOf(session, userId) };
  }

  relayIce(
    userId: number,
    callId: string,
    candidate: IceCandidatePayload,
  ): { session: CallSession; toUserId: number } {
    const session = this.requireParticipant(userId, callId);
    if (session.state !== 'active') throw new WsException('call is not active');
    if (candidate.candidate && candidate.candidate.length > 2_000) {
      throw new WsException('bad candidate');
    }
    return { session, toUserId: this.peerOf(session, userId) };
  }

  /** Завершает звонок. Возвращает сессию, если она ещё была жива. */
  end(userId: number, callId: string): CallSession | undefined {
    const session = this.byId.get(callId);
    if (!session) return undefined;
    if (session.callerId !== userId && session.calleeId !== userId) {
      throw new WsException('forbidden');
    }
    this.drop(session);
    return session;
  }

  /** Все звонки пользователя — для обрыва при disconnect. */
  endForUser(userId: number): CallSession[] {
    const callId = this.byUser.get(userId);
    if (!callId) return [];
    const session = this.byId.get(callId);
    if (!session) {
      this.byUser.delete(userId);
      return [];
    }
    this.drop(session);
    return [session];
  }

  peerOf(session: CallSession, userId: number): number {
    return session.callerId === userId ? session.calleeId : session.callerId;
  }

  private requireParticipant(userId: number, callId: string): CallSession {
    const session = this.byId.get(callId);
    if (!session) throw new WsException('call not found');
    if (session.callerId !== userId && session.calleeId !== userId) {
      throw new WsException('forbidden');
    }
    return session;
  }

  private track(session: CallSession) {
    this.byId.set(session.id, session);
    this.byUser.set(session.callerId, session.id);
    this.byUser.set(session.calleeId, session.id);
  }

  private drop(session: CallSession) {
    this.clearTimer(session.id);
    this.byId.delete(session.id);
    if (this.byUser.get(session.callerId) === session.id) this.byUser.delete(session.callerId);
    if (this.byUser.get(session.calleeId) === session.id) this.byUser.delete(session.calleeId);
  }

  private clearTimer(callId: string) {
    const timer = this.timers.get(callId);
    if (timer) clearTimeout(timer);
    this.timers.delete(callId);
  }
}
