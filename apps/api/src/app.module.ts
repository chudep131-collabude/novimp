import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { OrdersModule } from './orders/orders.module';
import { ServicesModule } from './services/services.module';
import { ProvidersModule } from './providers/providers.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { SupportModule } from './support/support.module';
import { SyncModule } from './sync/sync.module';
import { TelegramModule } from './telegram/telegram.module';
import { CommonModule } from './common/common.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AppController } from './app.controller';
import { validate } from './config/env.validation';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      cache: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    }),
    PrismaModule,
    QueueModule,
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    WalletModule,
    OrdersModule,
    ServicesModule,
    ProvidersModule,
    PaymentsModule,
    AdminModule,
    SupportModule,
    SyncModule,
    TelegramModule,
    AnnouncementsModule,
  ],
})
export class AppModule {}
