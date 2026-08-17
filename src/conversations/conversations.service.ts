import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

const conversationInclude = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
  messages: {
    take: 1,
    orderBy: { createdAt: 'desc' as const },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  listForUser(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: conversationInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateConversationDto) {
    const memberIds = Array.from(new Set([userId, ...dto.memberIds]));

    if (dto.type === ConversationType.DIRECT) {
      if (memberIds.length !== 2) {
        throw new BadRequestException('Direct conversations require exactly two members');
      }

      const existing = await this.findExistingDirect(memberIds);
      if (existing) {
        return existing;
      }
    }

    if (dto.type === ConversationType.CHANNEL && !dto.name) {
      throw new BadRequestException('Channel conversations require a name');
    }

    const usersCount = await this.prisma.user.count({
      where: { id: { in: memberIds } },
    });

    if (usersCount !== memberIds.length) {
      throw new BadRequestException('One or more members do not exist');
    }

    return this.prisma.conversation.create({
      data: {
        type: dto.type,
        name: dto.type === ConversationType.CHANNEL ? dto.name : null,
        description: dto.description,
        isPrivate: dto.isPrivate ?? false,
        members: {
          create: memberIds.map((memberId) => ({
            userId: memberId,
            role: memberId === userId ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      include: conversationInclude,
    });
  }

  async assertMember(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this conversation');
    }

    return member;
  }

  async getMemberUserIds(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { members: { select: { userId: true } } },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation.members.map((member) => member.userId);
  }

  async updateChannel(userId: string, channelId: string, dto: UpdateChannelDto) {
    await this.assertChannelMember(channelId, userId);

    return this.prisma.conversation.update({
      where: { id: channelId },
      data: {
        name: dto.name,
        description: dto.description,
        isPrivate: dto.isPrivate,
      },
      include: conversationInclude,
    });
  }

  async setChannelMembers(userId: string, channelId: string, memberIds: string[]) {
    await this.assertChannelMember(channelId, userId);

    const nextMemberIds = Array.from(new Set(memberIds));
    const usersCount = await this.prisma.user.count({
      where: { id: { in: nextMemberIds } },
    });

    if (usersCount !== nextMemberIds.length) {
      throw new BadRequestException('One or more members do not exist');
    }

    await this.prisma.$transaction([
      this.prisma.conversationMember.deleteMany({
        where: {
          conversationId: channelId,
          userId: { notIn: nextMemberIds },
        },
      }),
      ...nextMemberIds.map((memberId) =>
        this.prisma.conversationMember.upsert({
          where: {
            conversationId_userId: {
              conversationId: channelId,
              userId: memberId,
            },
          },
          update: {},
          create: {
            conversationId: channelId,
            userId: memberId,
            role: memberId === userId ? 'OWNER' : 'MEMBER',
          },
        }),
      ),
    ]);

    return this.prisma.conversation.findUniqueOrThrow({
      where: { id: channelId },
      include: conversationInclude,
    });
  }

  private async findExistingDirect(memberIds: string[]) {
    const candidates = await this.prisma.conversation.findMany({
      where: {
        type: ConversationType.DIRECT,
        members: {
          every: {
            userId: { in: memberIds },
          },
        },
      },
      include: conversationInclude,
    });

    return candidates.find((conversation) => conversation.members.length === 2);
  }

  private async assertChannelMember(channelId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: channelId },
      select: { type: true },
    });

    if (!conversation) {
      throw new NotFoundException('Channel not found');
    }

    if (conversation.type !== ConversationType.CHANNEL) {
      throw new BadRequestException('Conversation is not a channel');
    }

    return this.assertMember(channelId, userId);
  }
}
