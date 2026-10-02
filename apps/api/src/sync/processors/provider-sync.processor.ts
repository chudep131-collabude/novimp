import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SyncService } from '../sync.service';
import { LoggerService } from '@/common/logger/logger.service';

@Processor('provider-sync')
export class ProviderSyncProcessor extends WorkerHost {
  constructor(
    private syncService: SyncService,
    private logger: LoggerService,
  ) {
    super();
  }

  async process(job: Job<{ providerId: string; jobType: string }>) {
    this.logger.log(`Processing sync job ${job.id} for provider ${job.data.providerId}`, 'ProviderSyncProcessor');

    try {
      const result = await this.syncService.syncProvider(job.data.providerId, job.data.jobType);
      return result;
    } catch (error) {
      this.logger.error(`Sync job ${job.id} failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined, 'ProviderSyncProcessor');
      throw error; // BullMQ will retry based on job options
    }
  }
}
