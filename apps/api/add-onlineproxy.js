require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function encrypt(text) {
  const keyString = process.env.ENCRYPTION_KEY;
  if (!keyString) throw new Error('ENCRYPTION_KEY is not set');
  const key = crypto.scryptSync(keyString, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return { encrypted, iv: iv.toString('hex'), tag: authTag.toString('hex') };
}

async function main() {
  console.log('Starting...');
  const apiKey = process.env.ONLINEPROXY_API_KEY;
  if (!apiKey) throw new Error('ONLINEPROXY_API_KEY is not set in .env');
  const encrypted = encrypt(apiKey);
  console.log('Encrypted API key');

  await prisma.provider.upsert({
    where: { name: 'onlineproxy' },
    update: {
      displayName: 'OnlineProxy',
      adapterType: 'onlineproxy',
      apiUrl: 'https://onlineproxy.io/api/client/v1',
      apiKey: encrypted.encrypted,
      apiKeyIv: `${encrypted.iv}:${encrypted.tag}`,
      syncInterval: 300,
      syncEnabled: true,
      status: 'ACTIVE',
    },
    create: {
      name: 'onlineproxy',
      displayName: 'OnlineProxy',
      adapterType: 'onlineproxy',
      apiUrl: 'https://onlineproxy.io/api/client/v1',
      apiKey: encrypted.encrypted,
      apiKeyIv: `${encrypted.iv}:${encrypted.tag}`,
      syncInterval: 300,
      syncEnabled: true,
      status: 'ACTIVE',
    },
  });

  console.log('OnlineProxy provider created/updated.');
}

main()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
