import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../common/auth-user';
import { CurrentUser } from '../common/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { SetChannelMembersDto } from './dto/set-channel-members.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@UseGuards(JwtAuthGuard)
@Controller('channels')
export class ChannelsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Patch(':channelId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.conversations.updateChannel(user.id, channelId, dto);
  }

  @Patch(':channelId/members')
  setMembers(
    @CurrentUser() user: AuthUser,
    @Param('channelId') channelId: string,
    @Body() dto: SetChannelMembersDto,
  ) {
    return this.conversations.setChannelMembers(user.id, channelId, dto.memberIds);
  }
}
