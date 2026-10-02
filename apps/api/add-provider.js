require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

function encrypt(text) {
  const keyString = process.env.ENCRYPTION_KEY;
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
  const apiKey = process.env.ONLINESIM_API_KEY;
  if (!apiKey) throw new Error('No ONLINESIM_API_KEY');
  const encrypted = encrypt(apiKey);
  console.log('Encrypted API key');
  
  await prisma.provider.upsert({
    where: { name: 'onlinesim' },
    update: {
      displayName: 'OnlineSIM',
      adapterType: 'onlinesim',
      apiUrl: 'https://onlinesim.io',
      apiKey: encrypted.encrypted,
      apiKeyIv: `${encrypted.iv}:${encrypted.tag}`,
      syncInterval: 300,
      syncEnabled: true,
      status: 'ACTIVE'
    },
    create: {
      name: 'onlinesim',
      displayName: 'OnlineSIM',
      adapterType: 'onlinesim',
      apiUrl: 'https://onlinesim.io',
      apiKey: encrypted.encrypted,
      apiKeyIv: `${encrypted.iv}:${encrypted.tag}`,
      syncInterval: 300,
      syncEnabled: true,
      status: 'ACTIVE'
    }
  });
  console.log('OnlineSIM provider created.');
}

main()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
