import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { AddReactionDto } from './dto/add-reaction.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessagesService } from './messages.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get('conversations/:conversationId/messages')
  list(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Query() query: ListMessagesDto,
  ) {
    return this.messages.list(user.id, conversationId, query);
  }

  @Post('conversations/:conversationId/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messages.send(user.id, conversationId, dto);
  }

  @Patch('messages/:messageId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messages.update(user.id, messageId, dto);
  }

  @Delete('messages/:messageId')
  remove(@CurrentUser() user: AuthUser, @Param('messageId') messageId: string) {
    return this.messages.remove(user.id, messageId);
  }

  @Post('messages/:messageId/reactions')
  addReaction(
    @CurrentUser() user: AuthUser,
    @Param('messageId') messageId: string,
    @Body() dto: AddReactionDto,
  ) {
    return this.messages.addReaction(user.id, messageId, dto);
  }

  @Post('messages/:messageId/read')
  markRead(@CurrentUser() user: AuthUser, @Param('messageId') messageId: string) {
    return this.messages.markRead(user.id, messageId);
  }

  @Get('search/messages')
  search(@CurrentUser() user: AuthUser, @Query('q') query = '') {
    return this.messages.search(user.id, query);
  }
}
