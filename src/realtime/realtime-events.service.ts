import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class RealtimeEventsService {
  private server?: Server;

  bind(server: Server) {
    this.server = server;
  }

  emitToConversation(conversationId: string, event: string, payload: unknown) {
    this.server?.to(`conversation:${conversationId}`).emit(event, payload);
  }

  emitToUsers(userIds: string[], event: string, payload: unknown) {
    userIds.forEach((userId) => {
      this.server?.to(`user:${userId}`).emit(event, payload);
    });
  }
}
