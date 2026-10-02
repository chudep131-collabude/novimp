import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SyncService } from './sync.service';
import { QueueService } from '@/queue/queue.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { RolesGuard } from '@/auth/guards/roles.guard';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SyncController {
  constructor(
    private syncService: SyncService,
    private queueService: QueueService,
  ) {}

  @Post('providers/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  async syncProvider(
    @Param('id') providerId: string,
    @Query('type') type?: string,
  ) {
    if (process.env.NODE_ENV === 'development' || !process.env.REDIS_URL || process.env.REDIS_URL.includes('localhost')) {
      // Local dev without Redis: run inline but don't await to avoid timeout
      this.syncService.syncProvider(providerId, type || 'all').catch((err) => {
        console.error('Local sync failed:', err);
      });
      return { success: true, queued: true, note: 'Ran inline (no local Redis)' };
    }

    // Enqueue the sync job — do NOT await inline; a full catalog sync takes
    // 30-60 s and would always exceed the client's 8 s HTTP timeout.
    await this.queueService.enqueueProviderSync(providerId, type || 'all');
    return { success: true, queued: true };
  }

  @Get('history')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getHistory(
    @Query('providerId') providerId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.syncService.getSyncHistory(
      providerId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
