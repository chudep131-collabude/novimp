import { IsString, IsEnum, IsOptional } from 'class-validator';
import { TicketCategory, TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsEnum(TicketCategory)
  category: TicketCategory;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsString()
  @IsOptional()
  orderId?: string;
}
