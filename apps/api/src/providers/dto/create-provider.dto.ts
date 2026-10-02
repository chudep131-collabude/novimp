import { IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  name: string;

  @IsString()
  displayName: string;

  @IsString()
  @IsIn(['autosmo', 'proxyseller', 'onlinesim'])
  adapterType: string;

  @IsString()
  apiUrl: string;

  @IsString()
  apiKey: string;

  @IsNumber()
  @IsOptional()
  syncInterval?: number;
}
