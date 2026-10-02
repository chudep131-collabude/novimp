import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import { WalletService } from '@/wallet/wallet.service';
import { IdempotencyService } from '@/common/idempotency/idempotency.service';
import { LoggerService } from '@/common/logger/logger.service';
import { EncryptionService } from '@/common/encryption/encryption.service';
import { AuditService } from '@/common/audit/audit.service';
import { v4 as uuidv4 } from 'uuid';

/** Allowed payment gateway identifiers. */
const ALLOWED_GATEWAYS = ['crypto'] as const;
type AllowedGateway = typeof ALLOWED_GATEWAYS[number];

function assertAllowedGateway(gateway: string): asserts gateway is AllowedGateway {
  if (!ALLOWED_GATEWAYS.includes(gateway as AllowedGateway)) {
    throw new BadRequestException(`Unknown payment gateway: ${gateway}`);
  }
}

@Injectable()
export class PaymentsService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private walletService: WalletService,
    private idempotencyService: IdempotencyService,
    private encryptionService: EncryptionService,
    private logger: LoggerService,
    private audit: AuditService,
  ) {}

  async createDeposit(
    userId: string,
    amount: number,
    gateway: string,
    options: {
      currency?: string;
      cryptoCurrency?: string;
      paymentMethod?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ) {
    assertAllowedGateway(gateway);

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const idempotencyKey = uuidv4();
    const currency = options.currency || 'USD';

    // Create pending deposit record
    const deposit = await this.prisma.deposit.create({
      data: {
        userId,
        amount: new (await import('@prisma/client')).Prisma.Decimal(amount),
        currency,
        gateway,
        paymentMethod: options.paymentMethod,
        status: 'PENDING',
        cryptoCurrency: options.cryptoCurrency,
        expectedAmount: new (await import('@prisma/client')).Prisma.Decimal(amount),
        idempotencyKey,
        metadata: (options.metadata || {}) as any,
      },
    });

    // Initialize gateway-specific payment
    let gatewayData: any = {};

    if (gateway === 'crypto') {
      gatewayData = await this.createCryptoDeposit(deposit.id, amount, options.cryptoCurrency || 'BTC');
    }

    // Update deposit with gateway data
    await this.prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        gatewayTransactionId: gatewayData.transactionId,
        cryptoAddress: gatewayData.address,
        metadata: {
          ...((deposit.metadata as Record<string, unknown> | null) ?? {}),
          gatewayData,
        },
      },
    });

    return {
      deposit,
      gatewayData,
    };
  }

  async handleWebhook(gateway: string, payload: any, signature: string) {
    if (gateway !== 'crypto') {
      throw new BadRequestException('Unknown gateway');
    }

    // TODO: Verify Heleket webhook signature using HELEKET_PAYMENT_KEY.
    // Pattern: md5(base64(json_payload) + payment_key) must equal payload.sign
    // Reference: https://doc.heleket.com/methods/payments/webhook

    // Normalize Heleket payload to internal event shape
    const event = {
      providerEventId: payload.uuid,
      depositId: payload.order_id,
      status: payload.status === 'paid' || payload.status === 'paid_over' ? 'completed' : payload.status,
      amount: Number(payload.payment_amount_usd ?? payload.payment_amount ?? 0),
      currency: payload.currency ?? 'USD',
      metadata: payload,
    };

    // Deduplicate by provider event ID
    const existing = await this.prisma.deposit.findUnique({
      where: { providerEventId: event.providerEventId },
    });
    if (existing) {
      this.logger.warn(`Duplicate webhook: ${event.providerEventId}`, 'PaymentsService');
      return { received: true, duplicate: true };
    }

    // Enqueue for async processing (don't do DB writes in webhook handler)
    // In production: await this.queue.add('process-payment-webhook', { event, gateway });
    await this.processWebhookEvent(event, gateway);

    return { received: true };
  }

  async processWebhookEvent(event: any, gateway: string) {
    const deposit = await this.prisma.deposit.findFirst({
      where: {
        gatewayTransactionId: event.depositId,
      },
    });

    if (!deposit) {
      this.logger.error(`Deposit not found for webhook: ${event.depositId}`, undefined, 'PaymentsService');
      return;
    }

    // Update deposit with provider event ID
    await this.prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        providerEventId: event.providerEventId,
        webhookPayload: event.metadata,
      },
    });

    // Handle under/over payment for crypto
    if (gateway === 'crypto') {
      const expected = deposit.expectedAmount?.toNumber() || 0;
      const received = event.amount;

      if (received < expected * 0.95) {
        // Underpaid
        await this.prisma.deposit.update({
          where: { id: deposit.id },
          data: {
            status: 'UNDERPAID',
            receivedAmount: new (await import('@prisma/client')).Prisma.Decimal(received),
            underpaidAmount: new (await import('@prisma/client')).Prisma.Decimal(expected - received),
            requiresReview: true,
            reviewReason: 'Underpayment detected',
          },
        });
        return;
      }

      if (received > expected * 1.05) {
        // Overpaid - credit full amount
        await this.prisma.deposit.update({
          where: { id: deposit.id },
          data: {
            status: 'OVERPAID',
            receivedAmount: new (await import('@prisma/client')).Prisma.Decimal(received),
            overpaidAmount: new (await import('@prisma/client')).Prisma.Decimal(received - expected),
          },
        });
      }
    }

    // Complete deposit and credit wallet
    if (event.status === 'completed' || event.status === 'succeeded') {
      await this.prisma.$transaction(async (tx) => {
        await tx.deposit.update({
          where: { id: deposit.id },
          data: { status: 'COMPLETED' },
        });
      });

      // Credit wallet
      const creditAmount = deposit.receivedAmount?.toNumber() || deposit.amount.toNumber();
      await this.walletService.credit(deposit.userId, creditAmount, 'DEPOSIT', {
        description: `Deposit via ${gateway}`,
        referenceType: 'deposit',
        referenceId: deposit.id,
        idempotencyKey: `deposit-wallet-${deposit.idempotencyKey}`,
      });
    }

    if (event.status === 'failed') {
      await this.prisma.deposit.update({
        where: { id: deposit.id },
        data: { status: 'FAILED' },
      });
    }
  }

  async getDeposits(userId: string, page = 1, limit = 20) {
    const [deposits, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deposit.count({ where: { userId } }),
    ]);

    return { deposits, total, page, limit };
  }

  async getDeposit(userId: string, depositId: string) {
    const deposit = await this.prisma.deposit.findFirst({
      where: { id: depositId, userId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    return deposit;
  }

  /**
   * Finance review queue: deposits across all users, defaulting to the ones
   * that actually need a human decision.
   *
   * `Deposit` has no Prisma relation to `User`, so the owner is joined
   * manually rather than via `include`.
   */
  async getDepositsForAdmin(
    page = 1,
    limit = 20,
    filters: { status?: string; requiresReview?: boolean; needsReview?: boolean; search?: string } = {},
  ) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    } else if (!filters.needsReview) {
      // Default view: anything awaiting review.
      where.status = { in: ['PENDING', 'UNDERPAID', 'MANUAL_REVIEW'] };
    }
    if (filters.needsReview === true || filters.requiresReview === true) where.requiresReview = true;

    // Resolve free-text search against owner email -> user ids.
    const term = filters.search?.trim();
    if (term) {
      const matchedUsers = await this.prisma.user.findMany({
        where: { email: { contains: term, mode: 'insensitive' } },
        select: { id: true },
      });
      where.userId = { in: matchedUsers.map((u) => u.id) };
    }

    const [deposits, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deposit.count({ where }),
    ]);

    // Attach owner details.
    const ownerIds = Array.from(new Set(deposits.map((d) => d.userId)));
    const owners = ownerIds.length
      ? await this.prisma.user.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, email: true, firstName: true, lastName: true },
      })
      : [];
    const ownerMap = new Map(owners.map((o) => [o.id, o]));

    return {
      deposits: deposits.map((d) => ({ ...d, user: ownerMap.get(d.userId) || null })),
      total,
      page,
      limit,
    };
  }

  // Admin: Manual review and approval
  async manualApproveDeposit(depositId: string, adminId: string, notes?: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== 'PENDING' && deposit.status !== 'UNDERPAID' && deposit.status !== 'MANUAL_REVIEW') {
      throw new BadRequestException('Deposit cannot be manually approved');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: 'COMPLETED',
          requiresReview: false,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          reviewNotes: notes,
        },
      });
    });

    const creditAmount = deposit.receivedAmount?.toNumber() || deposit.amount.toNumber();
    await this.walletService.credit(deposit.userId, creditAmount, 'DEPOSIT', {
      description: `Manual deposit approval`,
      referenceType: 'deposit',
      referenceId: deposit.id,
      idempotencyKey: `manual-deposit-${deposit.id}`,
    });

    await this.audit.record({
      userId: adminId,
      action: 'deposit.manual_approve',
      entityType: 'deposit',
      entityId: deposit.id,
      oldValue: { status: deposit.status },
      newValue: { status: 'COMPLETED', credited: creditAmount },
      reason: notes,
    });

    return { success: true };
  }

  async manualRejectDeposit(depositId: string, adminId: string, reason: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.status !== 'PENDING' && deposit.status !== 'UNDERPAID' && deposit.status !== 'MANUAL_REVIEW') {
      throw new BadRequestException('Deposit cannot be rejected in its current state');
    }

    await this.prisma.deposit.update({
      where: { id: depositId },
      data: {
        status: 'FAILED',
        requiresReview: false,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNotes: reason,
      },
    });

    await this.audit.record({
      userId: adminId,
      action: 'deposit.manual_reject',
      entityType: 'deposit',
      entityId: deposit.id,
      oldValue: { status: deposit.status },
      newValue: { status: 'FAILED' },
      reason,
    });

    return { success: true };
  }

  private async createCryptoDeposit(depositId: string, amount: number, cryptoCurrency: string) {
    // TODO: Replace with real Heleket invoice creation.
    // Reference: https://doc.heleket.com/methods/payments/creating-invoice
    // const client = new HeleketPayment(HELEKET_MERCHANT_ID, HELEKET_PAYMENT_KEY);
    // const invoice = await client.createInvoice({
    //   amount: String(amount),
    //   currency: 'USD',
    //   to_currency: cryptoCurrency,
    //   order_id: depositId,
    //   url_callback: `${APP_URL}/api/payments/webhooks/crypto`,
    // });
    // return { transactionId: depositId, address: invoice.address, payUrl: invoice.url };
    return {
      transactionId: depositId,
      address: `placeholder_address_${depositId.substring(0, 8)}`,
      currency: cryptoCurrency,
    };
  }
}
