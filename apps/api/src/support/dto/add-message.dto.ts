import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class AddMessageDto {
  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}
