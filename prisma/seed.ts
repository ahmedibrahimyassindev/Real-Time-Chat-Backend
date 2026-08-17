import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function upsertUser(email: string, name: string) {
  const password = await bcrypt.hash('Password123!', 10);

  return prisma.user.upsert({
    where: { email },
    update: { name, password },
    create: { email, name, password },
  });
}

async function main() {
  const ahmed = await upsertUser('ahmed@example.com', 'Ahmed');
  const sara = await upsertUser('sara@example.com', 'Sara');

  const conversation = await prisma.conversation.create({
    data: {
      type: 'DIRECT',
      members: {
        create: [
          { userId: ahmed.id, role: 'OWNER' },
          { userId: sara.id, role: 'MEMBER' },
        ],
      },
      messages: {
        create: [
          {
            senderId: ahmed.id,
            content: 'Hi Sara, this is the seeded direct chat.',
          },
          {
            senderId: sara.id,
            content: 'Looks good. The real-time backend is connected.',
          },
        ],
      },
    },
  });

  console.log(`Seeded users and conversation ${conversation.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
