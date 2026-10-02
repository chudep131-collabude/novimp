import { Module } from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsController } from './announcements.controller';

// TelegramModule is @Global() so TelegramService is injected automatically.
@Module({
  providers: [AnnouncementsService],
  controllers: [AnnouncementsController],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
