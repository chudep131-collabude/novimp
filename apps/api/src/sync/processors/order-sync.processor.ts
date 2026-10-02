import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SyncService } from '../sync.service';
import { LoggerService } from '@/common/logger/logger.service';

@Processor('order-processing')
export class OrderSyncProcessor extends WorkerHost {
  constructor(
    private syncService: SyncService,
    private logger: LoggerService,
  ) {
    super();
  }

  async process(job: Job<{ orderId: string }>) {
    this.logger.log(`Processing order status sync ${job.id} for order ${job.data.orderId}`, 'OrderSyncProcessor');

    try {
      await this.syncService.syncOrderStatus(job.data.orderId);
      return { success: true };
    } catch (error) {
      this.logger.error(`Order sync ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined, 'OrderSyncProcessor');
      throw error;
    }
  }
}
