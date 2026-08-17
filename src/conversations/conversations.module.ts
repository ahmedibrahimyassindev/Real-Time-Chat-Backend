import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  controllers: [ConversationsController, ChannelsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
