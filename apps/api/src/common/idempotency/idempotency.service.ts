import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class IdempotencyService {
  constructor(private prisma: PrismaService) {}

  async checkIdempotency(key: string, entityType: string): Promise<{ exists: boolean; result?: any }> {
    // Check wallet transactions
    const walletTx = await this.prisma.walletTransaction.findUnique({
      where: { idempotencyKey: key },
    });
    if (walletTx) return { exists: true, result: walletTx };

    // Check orders
    const order = await this.prisma.order.findUnique({
      where: { idempotencyKey: key },
    });
    if (order) return { exists: true, result: order };

    // Check deposits
    const deposit = await this.prisma.deposit.findUnique({
      where: { idempotencyKey: key },
    });
    if (deposit) return { exists: true, result: deposit };

    return { exists: false };
  }
}
