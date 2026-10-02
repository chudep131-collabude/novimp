import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [ProvidersModule],
  providers: [ServicesService],
  controllers: [ServicesController],
  exports: [ServicesService],
})
export class ServicesModule {}
