import { IsString, IsOptional, IsNumber, IsBoolean, IsIn } from 'class-validator';

export class UpdateProviderDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  apiUrl?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsNumber()
  @IsOptional()
  syncInterval?: number;

  @IsBoolean()
  @IsOptional()
  syncEnabled?: boolean;
}
