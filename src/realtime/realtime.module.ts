import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ChatGateway } from './chat.gateway';
import { RealtimeEventsService } from './realtime-events.service';

@Module({
  imports: [AuthModule, ConversationsModule],
  providers: [ChatGateway, RealtimeEventsService],
  exports: [RealtimeEventsService],
})
export class RealtimeModule {}
