import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  list() {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { name: 'asc' },
    });
  }
}
