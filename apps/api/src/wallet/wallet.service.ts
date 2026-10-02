import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IdempotencyService } from '@/common/idempotency/idempotency.service';
import { LoggerService } from '@/common/logger/logger.service';
import { AuditService } from '@/common/audit/audit.service';
import { TransactionType, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

export interface BalanceDiscrepancy {
  walletId: string;
  userId: string;
  expected: Prisma.Decimal;
  actual: Prisma.Decimal;
  diff: Prisma.Decimal;
}

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private idempotencyService: IdempotencyService,
    private logger: LoggerService,
    private audit: AuditService,
  ) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.walletTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    return { transactions, total, page, limit };
  }

  /**
   * Credit wallet (deposit, refund, bonus, adjustment)
   * Uses row-level locking and idempotency keys
   */
  async credit(
    userId: string,
    amount: number,
    type: TransactionType,
    options: {
      description?: string;
      referenceType?: string;
      referenceId?: string;
      idempotencyKey?: string;
      // Use Prisma.InputJsonValue to stay compatible with Prisma JSON column typing
      metadata?: Prisma.InputJsonValue;
    } = {},
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const idempotencyKey = options.idempotencyKey || uuidv4();

    // Check idempotency
    const existing = await this.idempotencyService.checkIdempotency(idempotencyKey, 'wallet');
    if (existing.exists) {
      this.logger.warn(`Duplicate credit detected: ${idempotencyKey}`, 'WalletService');
      return existing.result;
    }

    return this.prisma.$transaction(async (tx) => {
      // Lock wallet row
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      // Re-read with lock
      const lockedWallet = await tx.$queryRaw<{ id: string; balance: Prisma.Decimal }[]>`
        SELECT id, balance FROM wallets 
        WHERE user_id = ${userId} 
        FOR UPDATE
      `;

      const currentBalance = lockedWallet[0]?.balance || new Prisma.Decimal(0);
      const newBalance = currentBalance.add(amount);

      // Update wallet balance
      await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      });

      // Create immutable ledger entry
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          userId,
          type,
          amount: new Prisma.Decimal(amount),
          balanceAfter: newBalance,
          description: options.description,
          referenceType: options.referenceType,
          referenceId: options.referenceId,
          idempotencyKey,
          metadata: options.metadata || {},
        },
      });

      this.logger.log(
        `Wallet credited: ${userId} +${amount} ${type} (balance: ${newBalance})`,
        'WalletService',
      );

      return transaction;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    });
  }

  /**
   * Debit wallet (purchase)
   * Uses row-level locking and idempotency keys
   */
  async debit(
    userId: string,
    amount: number,
    options: {
      description?: string;
      referenceType?: string;
      referenceId?: string;
      idempotencyKey?: string;
      // Use Prisma.InputJsonValue to stay compatible with Prisma JSON column typing
      metadata?: Prisma.InputJsonValue;
    } = {},
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const idempotencyKey = options.idempotencyKey || uuidv4();

    // Check idempotency
    const existing = await this.idempotencyService.checkIdempotency(idempotencyKey, 'wallet');
    if (existing.exists) {
      this.logger.warn(`Duplicate debit detected: ${idempotencyKey}`, 'WalletService');
      return existing.result;
    }

    return this.prisma.$transaction(async (tx) => {
      // Lock wallet row
      const lockedWallet = await tx.$queryRaw<{ id: string; balance: Prisma.Decimal }[]>`
        SELECT id, balance FROM wallets 
        WHERE user_id = ${userId} 
        FOR UPDATE
      `;

      if (!lockedWallet.length) {
        throw new NotFoundException('Wallet not found');
      }

      const currentBalance = lockedWallet[0].balance;
      const amountDecimal = new Prisma.Decimal(amount);

      if (currentBalance.lessThan(amountDecimal)) {
        throw new BadRequestException('Insufficient balance');
      }

      const newBalance = currentBalance.sub(amountDecimal);

      // Update wallet balance
      await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      });

      // Create immutable ledger entry
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: lockedWallet[0].id,
          userId,
          type: 'PURCHASE',
          amount: amountDecimal.neg(), // negative for debit
          balanceAfter: newBalance,
          description: options.description,
          referenceType: options.referenceType,
          referenceId: options.referenceId,
          idempotencyKey,
          metadata: options.metadata || {},
        },
      });

      this.logger.log(
        `Wallet debited: ${userId} -${amount} (balance: ${newBalance})`,
        'WalletService',
      );

      return transaction;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    });
  }

  /**
   * Refund wallet
   */
  async refund(
    userId: string,
    amount: number,
    options: {
      description?: string;
      referenceId?: string;
      idempotencyKey?: string;
    } = {},
  ) {
    return this.credit(userId, amount, 'REFUND', {
      ...options,
      referenceType: 'order',
    });
  }

  /**
   * Reconciliation: compare ledger sum vs materialized balance
   */
  async reconcile(userId?: string) {
    const wallets = userId 
      ? await this.prisma.wallet.findMany({ where: { userId } })
      : await this.prisma.wallet.findMany();

    const discrepancies: BalanceDiscrepancy[] = [];

    for (const wallet of wallets) {
      const ledgerSum = await this.prisma.walletTransaction.aggregate({
        where: { walletId: wallet.id },
        _sum: { amount: true },
      });

      const expectedBalance = ledgerSum._sum.amount || new Prisma.Decimal(0);
      const actualBalance = wallet.balance;

      if (!expectedBalance.equals(actualBalance)) {
        discrepancies.push({
          walletId: wallet.id,
          userId: wallet.userId,
          expected: expectedBalance,
          actual: actualBalance,
          diff: expectedBalance.sub(actualBalance),
        });
      }
    }

    if (discrepancies.length > 0) {
      this.logger.error(
        `Balance reconciliation failed for ${discrepancies.length} wallets`,
        JSON.stringify(discrepancies),
        'WalletService',
      );
    }

    return {
      checked: wallets.length,
      discrepancies,
      passed: discrepancies.length === 0,
    };
  }

  /**
   * Admin wallet adjustment: credit or debit any user's wallet.
   * Positive amount = credit, negative = debit.
   * type must be ADJUSTMENT | BONUS | CHARGEBACK.
   */
  async adminAdjust(
    actorId: string,
    targetUserId: string,
    amount: number,
    type: 'ADJUSTMENT' | 'BONUS' | 'CHARGEBACK',
    description: string,
    reason: string,
  ) {
    if (amount === 0) {
      throw new BadRequestException('Amount cannot be zero');
    }

    const idempotencyKey = uuidv4();

    const result = await this.prisma.$transaction(async (tx) => {
      // Lock the wallet row
      const lockedWallet = await tx.$queryRaw<{ id: string; balance: Prisma.Decimal }[]>`
        SELECT id, balance FROM wallets
        WHERE user_id = ${targetUserId}
        FOR UPDATE
      `;

      if (!lockedWallet.length) {
        throw new NotFoundException('Wallet not found for target user');
      }

      const currentBalance = new Prisma.Decimal(lockedWallet[0].balance);
      const amountDecimal = new Prisma.Decimal(amount);
      const newBalance = currentBalance.add(amountDecimal);

      if (newBalance.lessThan(0)) {
        throw new BadRequestException('Adjustment would result in negative balance');
      }

      await tx.wallet.update({
        where: { userId: targetUserId },
        data: { balance: newBalance },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: lockedWallet[0].id,
          userId: targetUserId,
          type: type as TransactionType,
          amount: amountDecimal,
          balanceAfter: newBalance,
          description,
          referenceType: 'admin_adjustment',
          referenceId: actorId,
          idempotencyKey,
          metadata: { actorId, reason },
        },
      });

      return transaction;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    });

    await this.audit.record({
      userId: actorId,
      action: 'wallet.admin_adjustment',
      entityType: 'Wallet',
      entityId: targetUserId,
      oldValue: {},
      newValue: { amount, type, description },
      reason,
    });

    this.logger.log(
      `Admin wallet adjustment: user=${targetUserId} amount=${amount} type=${type} by actor=${actorId}`,
      'WalletService',
    );

    return result;
  }

  /**
   * Admin: get paginated transactions for any user.
   */
  async getUserTransactions(targetUserId: string, page = 1, limit = 20) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: targetUserId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found for user');
    }

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);

    return { transactions, total, page, limit };
  }
}
