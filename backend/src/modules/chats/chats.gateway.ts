import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { TokenStoreService } from '@modules/security/token-store.service';
import { PresenceService } from './presence.service';
import { ChatsService } from './chats.service';
import { JwtPayload } from '@modules/security/types';
import { SendMessageDto } from './dto/request/send-message.dto';

@WebSocketGateway({ cors: true, namespace: '/chat' })
export class ChatsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly tokenStore: TokenStoreService,
    private readonly chatsService: ChatsService,
    private readonly presenceService: PresenceService,
  ) {}

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
      const stillOnline = await this.presenceService.markOffline(userId, client.data.sid);
      if (!stillOnline) this.server.emit('presence', { userId, online: false });
    }
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
    client.to(`chat:${dto.chatId}`).emit('typing', {
      chatId: dto.chatId,
      userId: client.data.userId,
      isTyping: dto.isTyping,
    });
  }
}
