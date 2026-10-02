import { Worker } from 'bullmq';
import Redis from 'ioredis';
import winston from 'winston';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  defaultMeta: { service: 'marketplace-worker' },
  transports: [new winston.transports.Console()],
});

// Initialize Prisma with adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  logger.info('Starting worker processes...');

  // Provider Sync Worker
  const providerSyncWorker = new Worker(
    'provider-sync',
    async (job) => {
      logger.info(`Processing provider sync: ${job.id}`, { providerId: job.data.providerId });
      // In production: import and use the same sync logic from the API
      // For now, log and acknowledge
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    { connection: redis, concurrency: 3 },
  );

  // Order Processing Worker
  const orderWorker = new Worker(
    'order-processing',
    async (job) => {
      logger.info(`Processing order: ${job.id}`, { orderId: job.data.orderId });
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    { connection: redis, concurrency: 5 },
  );

  // Webhook Processing Worker
  const webhookWorker = new Worker(
    'webhook-processing',
    async (job) => {
      logger.info(`Processing webhook: ${job.id}`, { gateway: job.data.gateway });
      await new Promise(resolve => setTimeout(resolve, 200));
      return { success: true };
    },
    { connection: redis, concurrency: 10 },
  );

  // Email Worker
  const emailWorker = new Worker(
    'email-sending',
    async (job) => {
      logger.info(`Sending email: ${job.id}`, { to: job.data.to, template: job.data.template });
      // In production: integrate with email service (SendGrid, SES, etc.)
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true };
    },
    { connection: redis, concurrency: 10 },
  );

  // Analytics Worker
  const analyticsWorker = new Worker(
    'analytics',
    async (job) => {
      logger.info(`Processing analytics: ${job.id}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    },
    { connection: redis, concurrency: 2 },
  );

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down workers...');
    await Promise.all([
      providerSyncWorker.close(),
      orderWorker.close(),
      webhookWorker.close(),
      emailWorker.close(),
      analyticsWorker.close(),
    ]);
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  logger.info('All workers started successfully');
}

main().catch((error) => {
  logger.error('Worker failed to start', error);
  process.exit(1);
});
