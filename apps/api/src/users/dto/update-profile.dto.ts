import { IsString, IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}
