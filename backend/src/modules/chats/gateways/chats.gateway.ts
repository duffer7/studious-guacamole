import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { forwardRef, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { TokenStoreService } from '@modules/security/token-store.service';
import { PresenceService } from '@modules/chats/services/presence.service';
import { ChatsService } from '@modules/chats/services/chats.service';
import {
  CallsService,
  type IceCandidatePayload,
  type SessionDescription,
} from '@modules/chats/services/calls.service';
import { ChatMembersRepository } from '@modules/chats/repositories/chat-members.repository';
import { JwtPayload } from '@modules/security/types';
import { SendMessageDto } from '@modules/chats/dto/request/send-message.dto';

@WebSocketGateway({ cors: true, namespace: '/chat' })
export class ChatsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly tokenStore: TokenStoreService,
    @Inject(forwardRef(() => ChatsService))
    private readonly chatsService: ChatsService,
    private readonly presenceService: PresenceService,
    private readonly callsService: CallsService,
    private readonly membersRepository: ChatMembersRepository,
  ) {}

  afterInit() {
    this.callsService.onEnded = (session, reason) => {
      const payload = { callId: session.id, reason };
      this.server.to(`user:${session.callerId}`).emit('call:ended', payload);
      this.server.to(`user:${session.calleeId}`).emit('call:ended', payload);
    };
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      const payload = await this.jwt.verifyAsync<JwtPayload>(token ?? '');
      if (payload.typ !== 'access') {
        throw new Error('bad token type');
      }

      if (await this.tokenStore.isRevoked(payload.jti, payload.sid)) {
        throw new Error('revoked');
      }

      client.data.userId = payload.sub;
      client.data.sid = payload.sid;

      await client.join(`user:${payload.sub}`);
      await client.join(`sid:${payload.sid}`);

      const chatIds = (await this.chatsService.getChatIdsByMemberId(payload.sub)) || [];
      for (const chatId of chatIds) {
        await client.join(`chat:${chatId}`);
      }

      await this.presenceService.markOnline(payload.sub, payload.sid);
      this.server.emit('presence', { userId: payload.sub, online: true });
    } catch {
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId as number | undefined;
    if (userId) {
      const stillConnected = await this.server.in(`user:${userId}`).fetchSockets();
      if (stillConnected.length === 0) {
        for (const session of this.callsService.endForUser(userId)) {
          const peerId = this.callsService.peerOf(session, userId);
          this.server.to(`user:${peerId}`).emit('call:ended', {
            callId: session.id,
            reason: 'disconnect',
          });
        }
      }

      const stillOnline = await this.presenceService.markOffline(userId, client.data.sid);
      if (!stillOnline) this.server.emit('presence', { userId, online: false });
    }
  }

  /** Уведомляет участников о новом чате и подписывает их сокеты на комнату чата. */
  async notifyChatCreated(chatId: number, chat: unknown, userIds: number[]) {
    for (const userId of userIds) {
      // подписываем все активные сокеты пользователя на комнату чата
      const sockets = await this.server.in(`user:${userId}`).fetchSockets();
      for (const socket of sockets) {
        socket.join(`chat:${chatId}`);
      }
      this.server.to(`user:${userId}`).emit('chat:new', chat);
    }
  }

  /** Уведомляет участников о добавлении новых членов и подписывает их сокеты. */
  async notifyMembersAdded(chatId: number, userIds: number[]) {
    for (const userId of userIds) {
      const sockets = await this.server.in(`user:${userId}`).fetchSockets();
      for (const socket of sockets) {
        socket.join(`chat:${chatId}`);
      }
      this.server.to(`user:${userId}`).emit('chat:member:added', { chatId });
    }
    // уже в чате — обновляем список участников
    this.server.to(`chat:${chatId}`).emit('chat:members:changed', { chatId });
  }

  @SubscribeMessage('message:send')
  async onSend(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    dto: SendMessageDto,
  ) {
    return this.chatsService.sendMessage(client.data.userId, dto, client);
  }

  @SubscribeMessage('message:read')
  async onRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { chatId: number; upToId: number },
  ) {
    return this.chatsService.markRead(client.data.userId, dto.chatId, dto.upToId);
  }

  @SubscribeMessage('typing')
  async onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { chatId: number; isTyping: boolean },
  ) {
    const userId = client.data.userId as number;
    const member = await this.membersRepository.findByUserIdAndChatId(dto.chatId, userId);
    if (!member) return;

    client.to(`chat:${dto.chatId}`).emit('typing', {
      chatId: dto.chatId,
      userId,
      isTyping: dto.isTyping,
    });
  }

  @SubscribeMessage('call:invite')
  async onCallInvite(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { chatId: number },
  ) {
    const callerId = client.data.userId as number;
    const session = await this.callsService.invite(callerId, dto.chatId);
    this.server.to(`user:${session.calleeId}`).emit('call:incoming', {
      callId: session.id,
      chatId: session.chatId,
      fromUserId: callerId,
    });
    return { callId: session.id, calleeId: session.calleeId };
  }

  @SubscribeMessage('call:accept')
  onCallAccept(@ConnectedSocket() client: Socket, @MessageBody() dto: { callId: string }) {
    const userId = client.data.userId as number;
    const session = this.callsService.accept(userId, dto.callId);
    this.server.to(`user:${session.callerId}`).emit('call:accepted', { callId: session.id });
    return { ok: true };
  }

  @SubscribeMessage('call:reject')
  onCallReject(@ConnectedSocket() client: Socket, @MessageBody() dto: { callId: string }) {
    const userId = client.data.userId as number;
    const session = this.callsService.reject(userId, dto.callId);
    const peerId = this.callsService.peerOf(session, userId);
    this.server.to(`user:${peerId}`).emit('call:ended', { callId: session.id, reason: 'rejected' });
    return { ok: true };
  }

  @SubscribeMessage('call:offer')
  onCallOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { callId: string; description: SessionDescription },
  ) {
    return this.forwardDescription(client, dto.callId, dto.description, 'call:offer');
  }

  @SubscribeMessage('call:answer')
  onCallAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { callId: string; description: SessionDescription },
  ) {
    return this.forwardDescription(client, dto.callId, dto.description, 'call:answer');
  }

  @SubscribeMessage('call:ice')
  onCallIce(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: { callId: string; candidate: IceCandidatePayload },
  ) {
    const userId = client.data.userId as number;
    const { toUserId } = this.callsService.relayIce(userId, dto.callId, dto.candidate ?? {});
    this.server.to(`user:${toUserId}`).emit('call:ice', {
      callId: dto.callId,
      candidate: dto.candidate,
    });
    return { ok: true };
  }

  @SubscribeMessage('call:hangup')
  onCallHangup(@ConnectedSocket() client: Socket, @MessageBody() dto: { callId: string }) {
    const userId = client.data.userId as number;
    const session = this.callsService.end(userId, dto.callId);
    if (!session) return { ok: true };
    const peerId = this.callsService.peerOf(session, userId);
    this.server.to(`user:${peerId}`).emit('call:ended', { callId: session.id, reason: 'hangup' });
    this.server.to(`user:${userId}`).emit('call:ended', { callId: session.id, reason: 'hangup' });
    return { ok: true };
  }

  private forwardDescription(
    client: Socket,
    callId: string,
    description: SessionDescription,
    event: 'call:offer' | 'call:answer',
  ) {
    const userId = client.data.userId as number;
    const { toUserId } = this.callsService.relayDescription(userId, callId, description);
    this.server.to(`user:${toUserId}`).emit(event, { callId, description });
    return { ok: true };
  }
}
