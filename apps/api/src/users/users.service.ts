import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/common/logger/logger.service';
import { AuditService } from '@/common/audit/audit.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
    private audit: AuditService,
    private config: ConfigService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        status: true,
        kycStatus: true,
        emailVerified: true,
        telegramId: true,
        telegramUsername: true,
        createdAt: true,
        wallet: {
          select: {
            id: true,
            balance: true,
            currency: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        avatarUrl: dto.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });

    this.logger.log(`Profile updated for user ${userId}`, 'UsersService');
    return user;
  }

  async listUsers(page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          kycStatus: true,
          createdAt: true,
          lastLoginAt: true,
          wallet: {
            select: {
              balance: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  async getUserStats() {
    const [total, active, newToday, byRole] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
    ]);

    return {
      total,
      active,
      newToday,
      byRole: byRole.map(r => ({ role: r.role, count: r._count.id })),
    };
  }

  async updateUserStatus(
    actorId: string,
    targetId: string,
    status: UserStatus,
    reason?: string,
  ) {
    const existing = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, status: true, email: true },
    });
    if (!existing) throw new NotFoundException('User not found');
    if (existing.id === actorId) throw new ForbiddenException('Cannot change your own status');

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { status },
      select: { id: true, email: true, status: true, role: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'user.status_update',
      entityType: 'User',
      entityId: targetId,
      oldValue: { status: existing.status },
      newValue: { status },
      reason,
    });

    this.logger.log(
      `User ${targetId} (${existing.email}) status changed to ${status} by ${actorId}`,
      'UsersService',
    );

    return updated;
  }

  async updateUserRole(
    actorId: string,
    actorRole: UserRole,
    targetId: string,
    role: UserRole,
    reason?: string,
  ) {
    if (role === 'SUPER_ADMIN' && actorRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only SUPER_ADMIN can assign SUPER_ADMIN role');
    }
    if (targetId === actorId) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true, email: true },
    });
    if (!existing) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role },
      select: { id: true, email: true, status: true, role: true },
    });

    await this.audit.record({
      userId: actorId,
      action: 'user.role_update',
      entityType: 'User',
      entityId: targetId,
      oldValue: { role: existing.role },
      newValue: { role },
      reason,
    });

    this.logger.log(
      `User ${targetId} (${existing.email}) role changed to ${role} by ${actorId}`,
      'UsersService',
    );

    return updated;
  }

  /** Link a Telegram account to the current user via initData from Telegram Web App. */
  async linkTelegram(userId: string, initData: string) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) throw new BadRequestException('Telegram is not configured');

    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) throw new BadRequestException('Invalid initData');
    urlParams.delete('hash');

    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys.map((k) => `${k}=${urlParams.get(k)}`).join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(token).digest();
    const signature = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    if (signature !== hash) throw new BadRequestException('Telegram signature invalid');

    const authDate = parseInt(urlParams.get('auth_date') ?? '0', 10);
    if (Math.floor(Date.now() / 1000) - authDate > 86400) {
      throw new BadRequestException('Telegram data expired');
    }

    const tgUser = JSON.parse(urlParams.get('user') ?? '{}');
    const telegramId = tgUser.id?.toString();
    if (!telegramId) throw new BadRequestException('Missing Telegram user');

    // Check it isn't already linked to another account
    const existing = await this.prisma.user.findFirst({
      where: { telegramId, NOT: { id: userId } },
    });
    if (existing) throw new ConflictException('This Telegram account is already linked to another user');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        telegramId,
        telegramUsername: tgUser.username ?? null,
      },
      select: { id: true, telegramId: true, telegramUsername: true },
    });

    this.logger.log(`Telegram linked for user ${userId} → @${tgUser.username}`, 'UsersService');
    return updated;
  }

  /** Remove the Telegram link from the current user. */
  async unlinkTelegram(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { telegramId: true },
    });
    if (!user?.telegramId) throw new BadRequestException('No Telegram account linked');

    await this.prisma.user.update({
      where: { id: userId },
      data: { telegramId: null, telegramUsername: null },
    });

    this.logger.log(`Telegram unlinked for user ${userId}`, 'UsersService');
    return { message: 'Telegram account unlinked' };
  }
}
