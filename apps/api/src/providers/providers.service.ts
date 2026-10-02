import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EncryptionService } from '@/common/encryption/encryption.service';
import { LoggerService } from '@/common/logger/logger.service';
import { AuditService } from '@/common/audit/audit.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private logger: LoggerService,
    private audit: AuditService,
  ) {}

  async findAll() {
    return this.prisma.provider.findMany({
      include: {
        _count: {
          select: { services: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        services: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            category: true,
            isAvailable: true,
          },
        },
        syncJobs: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    return provider;
  }

  async create(dto: CreateProviderDto) {
    const encrypted = this.encryptionService.encrypt(dto.apiKey);

    const provider = await this.prisma.provider.create({
      data: {
        name: dto.name,
        displayName: dto.displayName,
        adapterType: dto.adapterType,
        apiUrl: dto.apiUrl,
        apiKey: encrypted.encrypted,
        apiKeyIv: `${encrypted.iv}:${encrypted.tag}`,
        syncInterval: dto.syncInterval || 300,
      },
    });

    this.logger.log(`Provider created: ${provider.name}`, 'ProvidersService');
    return provider;
  }

  async update(id: string, dto: UpdateProviderDto) {
    const updateData: any = { ...dto };

    if (dto.apiKey) {
      const encrypted = this.encryptionService.encrypt(dto.apiKey);
      updateData.apiKey = encrypted.encrypted;
      updateData.apiKeyIv = `${encrypted.iv}:${encrypted.tag}`;
      delete updateData.apiKey;
    }

    const provider = await this.prisma.provider.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Provider updated: ${provider.name}`, 'ProvidersService');
    return provider;
  }

  async pauseProvider(id: string, actorId?: string) {
    const provider = await this.prisma.provider.update({
      where: { id },
      data: { status: 'PAUSED', syncEnabled: false },
    });

    this.logger.warn(`Provider paused: ${provider.name}`, 'ProvidersService');

    if (actorId) {
      await this.audit.record({
        userId: actorId,
        action: 'provider.pause',
        entityType: 'provider',
        entityId: provider.id,
        oldValue: { status: 'ACTIVE' },
        newValue: { status: provider.status, syncEnabled: provider.syncEnabled },
      });
    }

    return provider;
  }

  async resumeProvider(id: string, actorId?: string) {
    const provider = await this.prisma.provider.update({
      where: { id },
      data: { status: 'ACTIVE', syncEnabled: true, consecutiveFailures: 0 },
    });

    this.logger.log(`Provider resumed: ${provider.name}`, 'ProvidersService');

    if (actorId) {
      await this.audit.record({
        userId: actorId,
        action: 'provider.resume',
        entityType: 'provider',
        entityId: provider.id,
        oldValue: { status: 'PAUSED' },
        newValue: { status: provider.status, syncEnabled: provider.syncEnabled },
      });
    }

    return provider;
  }

  async getDecryptedApiKey(providerId: string): Promise<{ apiKey: string; apiUrl: string }> {
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const [iv, tag] = provider.apiKeyIv.split(':');
    const apiKey = this.encryptionService.decrypt(
      provider.apiKey,
      iv,
      tag || '', // tag stored with encrypted or separate field
    );

    return { apiKey, apiUrl: provider.apiUrl };
  }

  async recordHealthCheck(providerId: string, healthy: boolean, responseTimeMs: number) {
    await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        avgResponseMs: responseTimeMs,
        consecutiveFailures: healthy ? 0 : { increment: 1 },
        status: healthy ? 'ACTIVE' : undefined,
        lastSyncError: healthy ? null : undefined,
      },
    });
  }
}
