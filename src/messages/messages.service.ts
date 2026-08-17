import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationsService } from '../conversations/conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeEventsService } from '../realtime/realtime-events.service';
import { AddReactionDto } from './dto/add-reaction.dto';
import { ListMessagesDto } from './dto/list-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

const messageInclude = {
  sender: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
    },
  },
  replyTo: {
    select: {
      id: true,
      content: true,
      senderId: true,
      deletedAt: true,
      createdAt: true,
    },
  },
  reactions: {
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
  reads: {
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
} as const;

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
    private readonly realtime: RealtimeEventsService,
  ) {}

  async list(userId: string, conversationId: string, query: ListMessagesDto) {
    await this.conversations.assertMember(conversationId, userId);

    const take = query.limit + 1;
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      take,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = messages.length > query.limit;
    const items = hasMore ? messages.slice(0, query.limit) : messages;

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async send(userId: string, conversationId: string, dto: SendMessageDto) {
    await this.conversations.assertMember(conversationId, userId);

    if (dto.replyToId) {
      const replyTo = await this.prisma.message.findUnique({
        where: { id: dto.replyToId },
        select: { conversationId: true },
      });

      if (!replyTo || replyTo.conversationId !== conversationId) {
        throw new NotFoundException('Reply message not found');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: dto.content,
        replyToId: dto.replyToId,
      },
      include: messageInclude,
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    this.realtime.emitToConversation(conversationId, 'message.created', message);
    return message;
  }

  async update(userId: string, messageId: string, dto: UpdateMessageDto) {
    const message = await this.getMessageForOwnerAction(messageId, userId);

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: dto.content,
        editedAt: new Date(),
      },
      include: messageInclude,
    });

    this.realtime.emitToConversation(
      message.conversationId,
      'message.updated',
      updated,
    );
    return updated;
  }

  async remove(userId: string, messageId: string) {
    const message = await this.getMessageForOwnerAction(messageId, userId);

    const deleted = await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
      include: messageInclude,
    });

    this.realtime.emitToConversation(
      message.conversationId,
      'message.deleted',
      deleted,
    );
    return deleted;
  }

  async addReaction(userId: string, messageId: string, dto: AddReactionDto) {
    const message = await this.getMessageWithMembership(messageId, userId);

    const reaction = await this.prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: dto.emoji,
        },
      },
      update: {},
      create: {
        messageId,
        userId,
        emoji: dto.emoji,
      },
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
    });

    const payload = {
      ...reaction,
      conversationId: message.conversationId,
    };

    this.realtime.emitToConversation(
      message.conversationId,
      'reaction.created',
      payload,
    );
    return payload;
  }

  async markRead(userId: string, messageId: string) {
    const message = await this.getMessageWithMembership(messageId, userId);

    const read = await this.prisma.messageRead.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      update: {},
      create: {
        messageId,
        userId,
      },
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
    });

    const payload = {
      id: messageId,
      messageId,
      conversationId: message.conversationId,
      userId,
      readId: read.id,
      createdAt: read.createdAt,
    };

    this.realtime.emitToConversation(message.conversationId, 'message.read', payload);
    return payload;
  }

  async search(userId: string, query: string) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    return this.prisma.message.findMany({
      where: {
        deletedAt: null,
        content: {
          contains: normalizedQuery,
          mode: 'insensitive',
        },
        conversation: {
          members: {
            some: { userId },
          },
        },
      },
      include: messageInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private async getMessageForOwnerAction(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        conversationId: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.conversations.assertMember(message.conversationId, userId);

    if (message.senderId !== userId) {
      throw new ForbiddenException('Only the sender can modify this message');
    }

    return message;
  }

  private async getMessageWithMembership(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        conversationId: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    await this.conversations.assertMember(message.conversationId, userId);
    return message;
  }
}
