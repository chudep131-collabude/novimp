import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { ProviderSyncProcessor } from './processors/provider-sync.processor';
import { OrderSyncProcessor } from './processors/order-sync.processor';
import { ProvidersModule } from '../providers/providers.module';
import { ServicesModule } from '../services/services.module';
import { OrdersModule } from '../orders/orders.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    QueueModule,
    ProvidersModule,
    ServicesModule,
    OrdersModule,
  ],
  providers: [SyncService, ProviderSyncProcessor, OrderSyncProcessor],
  controllers: [SyncController],
  exports: [SyncService],
})
export class SyncModule {}
