import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConversationsService } from '../conversations/conversations.service';
import { RealtimeEventsService } from './realtime-events.service';

type AuthenticatedSocket = Socket & {
  data: {
    user?: {
      id: string;
      email: string;
    };
  };
};

type TypingPayload = {
  conversationId: string;
};

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly conversations: ConversationsService,
    private readonly realtime: RealtimeEventsService,
  ) {}

  afterInit(server: Server) {
    this.realtime.bind(server);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const user = this.authenticate(client);
      client.data.user = user;

      client.join(`user:${user.id}`);
      await this.joinConversationRooms(client, user.id);
      this.trackConnection(user.id, client.id);
    } catch (error) {
      this.logger.warn(`Socket authentication failed: ${String(error)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user) {
      return;
    }

    const remaining = this.userSockets.get(user.id);
    remaining?.delete(client.id);

    if (!remaining || remaining.size === 0) {
      this.userSockets.delete(user.id);
      this.server.emit('user.offline', { userId: user.id });
    }
  }

  @SubscribeMessage('typing.start')
  async typingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TypingPayload,
  ) {
    await this.emitTyping(client, payload, 'typing.started');
  }

  @SubscribeMessage('typing.stop')
  async typingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: TypingPayload,
  ) {
    await this.emitTyping(client, payload, 'typing.stopped');
  }

  private authenticate(client: Socket) {
    const token = client.handshake.auth?.token;
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Missing socket token');
    }

    const payload = this.jwt.verify<{ sub: string; email: string }>(token, {
      secret: this.config.get<string>('JWT_SECRET') ?? 'change-this-secret',
    });

    return {
      id: payload.sub,
      email: payload.email,
    };
  }

  private async joinConversationRooms(client: Socket, userId: string) {
    const conversations = await this.conversations.listForUser(userId);
    conversations.forEach((conversation) => {
      client.join(`conversation:${conversation.id}`);
    });
  }

  private trackConnection(userId: string, socketId: string) {
    const existing = this.userSockets.get(userId) ?? new Set<string>();
    const wasOffline = existing.size === 0;

    existing.add(socketId);
    this.userSockets.set(userId, existing);

    if (wasOffline) {
      this.server.emit('user.online', { userId });
    }
  }

  private async emitTyping(
    client: AuthenticatedSocket,
    payload: TypingPayload,
    event: 'typing.started' | 'typing.stopped',
  ) {
    const user = client.data.user;
    if (!user || !payload?.conversationId) {
      return;
    }

    await this.conversations.assertMember(payload.conversationId, user.id);

    client.to(`conversation:${payload.conversationId}`).emit(event, {
      conversationId: payload.conversationId,
      userId: user.id,
    });
  }
}
