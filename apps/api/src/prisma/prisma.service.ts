import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL');
    const pool = new Pool({
      connectionString,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 10,
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: configService.get('NODE_ENV') === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error', 'warn'],
    });

    pool.on('error', (err) => {
      console.error('[PrismaService] Unexpected pg pool error:', err);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    if (this.configService.get('NODE_ENV') === 'production') {
      throw new Error('Cannot clean database in production');
    }
    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && !key.startsWith('$') && !key.startsWith('_'),
    );
    return Promise.all(models.map((modelKey) => (this as any)[modelKey].deleteMany()));
  }
}
