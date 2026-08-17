import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [ConversationsModule, RealtimeModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
