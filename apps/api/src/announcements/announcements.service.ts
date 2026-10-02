import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TelegramService } from '@/telegram/telegram.service';
import { AnnouncementType } from '@prisma/client';

export interface CreateAnnouncementDto {
  title: string;
  content: string;
  type?: AnnouncementType;
  startsAt?: string;
  expiresAt?: string;
}

const TYPE_EMOJI: Record<AnnouncementType, string> = {
  INFO: 'ℹ️',
  WARNING: '⚠️',
  MAINTENANCE: '🔧',
  PROMOTION: '🎉',
};

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
  ) {}

  /** Public: return currently active announcements (within date window). */
  async getActive() {
    const now = new Date();
    return this.prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        startsAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  /** Admin: create a new announcement and broadcast it to all Telegram subscribers. */
  async create(dto: CreateAnnouncementDto) {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        type: dto.type ?? 'INFO',
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: true,
      },
    });

    // Fire-and-forget broadcast to all users who have linked their Telegram.
    this.broadcastToUsers(announcement).catch(() => {/* swallow; logged inside */});

    return announcement;
  }

  /** Admin: toggle isActive on an existing announcement. */
  async setActive(id: string, isActive: boolean) {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Announcement not found');
    return this.prisma.announcement.update({ where: { id }, data: { isActive } });
  }

  /** Admin: list all announcements (active and inactive). */
  async findAll() {
    return this.prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } });
  }

  // ── private ────────────────────────────────────────────────────────────────

  private async broadcastToUsers(announcement: {
    title: string;
    content: string;
    type: AnnouncementType;
  }) {
    // Fetch all users who have a linked Telegram ID.
    const users = await this.prisma.user.findMany({
      where: { telegramId: { not: null } },
      select: { telegramId: true },
    });

    if (!users.length) return;

    const emoji = TYPE_EMOJI[announcement.type] ?? 'ℹ️';
    const message =
      `${emoji} <b>${this.escape(announcement.title)}</b>\n\n` +
      `${this.escape(announcement.content)}`;

    // Send in parallel; individual failures don't abort the batch.
    await Promise.allSettled(
      users.map((u) => this.telegram.sendMessage(u.telegramId!, message)),
    );
  }

  /** Escape HTML special chars for Telegram HTML parse mode. */
  private escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
