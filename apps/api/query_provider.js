const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const providers = await prisma.provider.findMany();
  console.log(JSON.stringify(providers.map(p => ({
    id: p.id,
    name: p.name,
    apiUrl: p.apiUrl
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
