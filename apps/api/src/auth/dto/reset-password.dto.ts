import { IsEmail, IsString, Length, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  /** 6-digit OTP sent to the user's email. */
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(128)
  newPassword: string;
}
