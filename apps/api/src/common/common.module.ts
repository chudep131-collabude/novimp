import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger/logger.service';
import { EncryptionService } from './encryption/encryption.service';
import { IdempotencyService } from './idempotency/idempotency.service';
import { AuditService } from './audit/audit.service';

@Global()
@Module({
  providers: [LoggerService, EncryptionService, IdempotencyService, AuditService],
  exports: [LoggerService, EncryptionService, IdempotencyService, AuditService],
})
export class CommonModule {}
