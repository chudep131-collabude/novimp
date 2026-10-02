import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsUUID,
  IsUrl,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  serviceId: string;

  @IsNumber()
  @Min(1)
  @Max(1000000)
  quantity: number;

  @IsUrl({ require_protocol: true }, { message: 'targetUrl must be a valid URL with protocol' })
  @MaxLength(2048)
  @IsOptional()
  targetUrl?: string;

  @IsString()
  @MaxLength(128)
  @IsOptional()
  targetUsername?: string;

  @IsObject()
  @IsOptional()
  customData?: Record<string, unknown>;

  @IsUUID()
  @IsOptional()
  idempotencyKey?: string;
}

