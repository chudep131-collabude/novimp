import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/common/logger/logger.service';

export interface AuditLogInput {
  /** Actor performing the action (staff user id). */
  userId?: string;
  /** Machine-readable action key, e.g. `order.status_update`. */
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Central audit trail writer. Used by every privileged mutation so admins and
 * sub-admins leave a tamper-evident record of what they changed and why.
 */
@Injectable()
export class AuditService {
  constructor(
    private prisma: PrismaService,
    private logger: LoggerService,
  ) {}

  /**
   * Persist an audit entry. Auditing is best-effort: a failure here must never
   * roll back or fail the underlying business mutation, so errors are logged
   * and swallowed.
   */
  async record(input: AuditLogInput) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: input.userId || null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          oldValue: (input.oldValue ?? {}) as Prisma.InputJsonValue,
          newValue: (input.newValue ?? {}) as Prisma.InputJsonValue,
          reason: input.reason,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to write audit log (${input.action} on ${input.entityType}:${input.entityId}): ${
          (error as Error).message
        }`,
        'AuditService',
      );
      return null;
    }
  }

  /** Convenience helper for extracting actor metadata from an HTTP request. */
  contextFromRequest(req?: {
    ip?: string;
    headers?: Record<string, unknown>;
  }): { ipAddress?: string; userAgent?: string } {
    if (!req) return {};
    const ua = req.headers?.['user-agent'];
    return {
      ipAddress: req.ip,
      userAgent: typeof ua === 'string' ? ua : undefined,
    };
  }
}
