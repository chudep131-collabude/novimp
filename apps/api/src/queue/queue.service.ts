import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('provider-sync') private providerSyncQueue: Queue,
    @InjectQueue('order-processing') private orderQueue: Queue,
    @InjectQueue('webhook-processing') private webhookQueue: Queue,
    @InjectQueue('email-sending') private emailQueue: Queue,
    @InjectQueue('analytics') private analyticsQueue: Queue,
  ) {}

  async enqueueProviderSync(providerId: string, jobType: string) {
    return this.providerSyncQueue.add('sync-provider', {
      providerId,
      jobType,
      timestamp: new Date().toISOString(),
    }, {
      jobId: `sync-${providerId}-${jobType}-${Date.now()}`,
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    });
  }

  async enqueueOrderProcessing(orderId: string) {
    return this.orderQueue.add('process-order', {
      orderId,
      timestamp: new Date().toISOString(),
    }, {
      jobId: `order-${orderId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
    });
  }

  async enqueueWebhook(gateway: string, payload: any, signature: string) {
    return this.webhookQueue.add('process-webhook', {
      gateway,
      payload,
      signature,
      timestamp: new Date().toISOString(),
    }, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 2000 },
    });
  }

  async enqueueEmail(to: string, template: string, data: any) {
    return this.emailQueue.add('send-email', {
      to,
      template,
      data,
      timestamp: new Date().toISOString(),
    }, {
      attempts: 3,
      backoff: { type: 'fixed', delay: 5000 },
    });
  }
}
