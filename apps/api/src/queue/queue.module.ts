import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'provider-sync' },
      { name: 'order-processing' },
      { name: 'webhook-processing' },
      { name: 'email-sending' },
      { name: 'analytics' },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
