import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = 'marketadmin@novi.com';
  const password = '5432123dadmin';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user already exists: ${email}. Deleting to re-seed with correct argon2 hash.`);
    await prisma.user.delete({ where: { email } });
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Market',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      status: 'ACTIVE',
      wallet: {
        create: {
          balance: 0,
          currency: 'USD',
        },
      },
    },
  });

  console.log(`✅ Admin user created: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
