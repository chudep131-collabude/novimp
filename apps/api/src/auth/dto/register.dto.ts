import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/, {
    message: 'Password must contain at least one uppercase letter, one digit, and one special character',
  })
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(64)
  lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(256)
  deviceFingerprint?: string;
}

