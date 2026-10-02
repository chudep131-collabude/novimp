import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { randomInt, createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '@/prisma/prisma.service';
import { EncryptionService } from '@/common/encryption/encryption.service';
import { LoggerService } from '@/common/logger/logger.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private encryptionService: EncryptionService,
    private logger: LoggerService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const isDev = this.configService.get('NODE_ENV') !== 'production';

    // Dev: auto-verify immediately. Production: generate OTP and send email.
    const otpCode = isDev ? null : this.generateOtp();
    const otpExpires = isDev ? null : new Date(Date.now() + 10 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: isDev ? 'ACTIVE' : 'PENDING_VERIFICATION',
        emailVerified: isDev,
        emailOtp: otpCode,
        emailOtpExpiry: otpExpires,
        lastLoginIp: ipAddress,
        deviceFingerprint: dto.deviceFingerprint,
      },
    });

    // Create wallet
    await this.prisma.wallet.create({
      data: {
        userId: user.id,
        balance: 0,
        currency: 'USD',
      },
    });

    if (!isDev && otpCode) {
      await this.sendVerificationOtp(user.email, otpCode);
    }
    this.logger.log(
      `User registered: ${user.id}${isDev ? ' (auto-verified, dev mode)' : ''}`,
      'AuthService',
    );

    return {
      userId: user.id,
      email: user.email,
      message: isDev
        ? 'Registration successful. You can now sign in.'
        : 'Registration successful. Please verify your email.',
      requiresVerification: !isDev,
    };
  }

  /**
   * Confirm a pending account using the 6-digit code emailed at registration.
   */
  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Generic response to avoid leaking account existence
    if (!user) {
      throw new BadRequestException('Verification code is invalid or has expired.');
    }

    if (user.emailVerified && user.status === 'ACTIVE') {
      return { message: 'Email already verified. You can sign in.' };
    }

    if (!user.emailOtp || !user.emailOtpExpiry) {
      throw new BadRequestException('Verification code is invalid or has expired.');
    }

    if (user.emailOtpExpiry < new Date()) {
      throw new BadRequestException('Verification code is invalid or has expired.');
    }

    if (user.emailOtp !== dto.code.trim()) {
      throw new BadRequestException('Verification code is invalid or has expired.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: 'ACTIVE',
        emailOtp: null,
        emailOtpExpiry: null,
      },
    });

    this.logger.log(`Email verified: ${user.id}`, 'AuthService');

    return { message: 'Email verified successfully. You can now sign in.' };
  }

  /**
   * Re-issue a verification code for an account still pending verification.
   * Responses are intentionally generic to avoid leaking account existence.
   */
  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user && user.status === 'PENDING_VERIFICATION') {
      const otpCode = this.generateOtp();
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailOtp: otpCode,
          emailOtpExpiry: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await this.sendVerificationOtp(user.email, otpCode);
    }

    return { message: 'If that account needs verification, a new code has been sent.' };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Account temporarily locked. Try again later.');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.handleFailedLogin(user.id, user.failedLoginAttempts);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      throw new ForbiddenException('Account is not active');
    }

    if (user.status === 'PENDING_VERIFICATION' || !user.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email before signing in. Check your inbox for the 6-digit code.',
      );
    }

    // Reset failed attempts
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.createSession(user.id, tokens, ipAddress, userAgent);

    this.logger.log(`User logged in: ${user.id} from ${ipAddress}`, 'AuthService');

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
      ...tokens,
    };
  }

  async loginWithTelegram(dto: TelegramLoginDto, ipAddress?: string, userAgent?: string) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new BadRequestException('Telegram login is not configured');
    }

    // Parse initData
    const urlParams = new URLSearchParams(dto.initData);
    const hash = urlParams.get('hash');
    if (!hash) {
      throw new BadRequestException('Invalid Telegram initData (missing hash)');
    }
    urlParams.delete('hash');

    // Sort parameters alphabetically
    const keys = Array.from(urlParams.keys()).sort();
    const dataCheckString = keys.map(key => `${key}=${urlParams.get(key)}`).join('\n');

    // Verify signature
    const secretKey = createHmac('sha256', 'WebAppData').update(token).digest();
    const signature = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (signature !== hash) {
      throw new UnauthorizedException('Telegram signature verification failed');
    }

    // Check expiration (Optional, let's say 24 hours max)
    const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      throw new UnauthorizedException('Telegram login expired');
    }

    const userJsonStr = urlParams.get('user');
    if (!userJsonStr) {
      throw new BadRequestException('Invalid Telegram initData (missing user)');
    }

    let tgUser: any;
    try {
      tgUser = JSON.parse(userJsonStr);
    } catch {
      throw new BadRequestException('Invalid user JSON string in initData');
    }

    const telegramId = tgUser.id.toString();
    const telegramUsername = tgUser.username || null;
    const firstName = tgUser.first_name || 'Telegram';
    const lastName = tgUser.last_name || 'User';

    // Determine if this Telegram user should have admin access.
    // TELEGRAM_ADMIN_IDS is a comma-separated list of Telegram user IDs.
    const adminIds = (this.configService.get<string>('TELEGRAM_ADMIN_IDS') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const isAdmin = adminIds.includes(telegramId);

    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      // Auto-register via Telegram
      const dummyEmail = `tg_${telegramId}@telegram.local`;
      
      const existingEmail = await this.prisma.user.findUnique({ where: { email: dummyEmail } });
      if (existingEmail) {
        user = existingEmail;
        // Elevate to admin if in the admin list and not already admin
        if (isAdmin && existingEmail.role !== 'SUPER_ADMIN' && existingEmail.role !== 'ADMIN') {
          user = await this.prisma.user.update({
            where: { id: existingEmail.id },
            data: { role: 'SUPER_ADMIN' },
          });
          this.logger.log(`Elevated Telegram user ${existingEmail.id} to SUPER_ADMIN`, 'AuthService');
        }
      } else {
        user = await this.prisma.user.create({
          data: {
            email: dummyEmail,
            passwordHash: await argon2.hash(uuidv4()),
            firstName,
            lastName,
            status: 'ACTIVE',
            emailVerified: true,
            telegramId,
            telegramUsername,
            role: isAdmin ? 'SUPER_ADMIN' : 'CUSTOMER',
            lastLoginIp: ipAddress,
            deviceFingerprint: userAgent,
          },
        });

        await this.prisma.wallet.create({
          data: { userId: user.id, balance: 0, currency: 'USD' },
        });
        
        this.logger.log(
          `User registered via Telegram: ${user.id}${isAdmin ? ' (SUPER_ADMIN)' : ''}`,
          'AuthService',
        );
      }
    } else {
      // Update info if it changed
      const updates: Record<string, unknown> = {};
      if (user.telegramUsername !== telegramUsername) updates.telegramUsername = telegramUsername;
      if (user.firstName !== firstName) updates.firstName = firstName;
      if (user.lastName !== lastName) updates.lastName = lastName;
      // Elevate to admin if newly added to the admin list
      if (isAdmin && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
        updates.role = 'SUPER_ADMIN';
        this.logger.log(`Elevated Telegram user ${user.id} to SUPER_ADMIN`, 'AuthService');
      }
      if (Object.keys(updates).length > 0) {
        user = await this.prisma.user.update({ where: { id: user.id }, data: updates });
      }
    }

    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      throw new ForbiddenException('Account is not active');
    }

    // Reset failed attempts & lock
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
        },
      });
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: ipAddress,
        },
      });
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.createSession(user.id, tokens, ipAddress, userAgent);

    this.logger.log(`User logged in via Telegram: ${user.id}`, 'AuthService');

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      const session = await this.prisma.session.findFirst({
        where: {
          userId: payload.sub,
          refreshToken,
          revokedAt: null,
        },
      });

      if (!session || !session.refreshExpiresAt || session.refreshExpiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('User not active');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);

      // Rotate refresh token
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          token: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, token: string) {
    await this.prisma.session.updateMany({
      where: { userId, token },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out from all devices' };
  }

  /**
   * Send a 6-digit password-reset OTP to the given email address.
   * Response is intentionally generic so we don't leak account existence.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (user && user.status === 'ACTIVE') {
      const code = this.generateOtp();
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: code,
          passwordResetExpiry: new Date(Date.now() + 15 * 60 * 1000), // 15 min
        },
      });
      await this.sendPasswordResetOtp(user.email, code);
      this.logger.log(`Password reset requested for: ${user.id}`, 'AuthService');
    }

    return {
      message: 'If an account with that email exists, a reset code has been sent.',
    };
  }

  /**
   * Verify the OTP and set a new password.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (
      !user ||
      !user.passwordResetToken ||
      !user.passwordResetExpiry ||
      user.passwordResetExpiry < new Date()
    ) {
      throw new BadRequestException('Reset code is invalid or has expired.');
    }

    if (user.passwordResetToken !== dto.code.trim()) {
      throw new BadRequestException('Reset code is invalid or has expired.');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
        // Invalidate all existing sessions after a password reset
        sessions: { updateMany: { where: { revokedAt: null }, data: { revokedAt: new Date() } } },
      },
    });

    this.logger.log(`Password reset completed for: ${user.id}`, 'AuthService');
    return { message: 'Password has been reset. You can now sign in.' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async createSession(
    userId: string,
    tokens: { accessToken: string; refreshToken: string },
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.prisma.session.create({
      data: {
        userId,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress,
        userAgent,
      },
    });
  }

  private async handleFailedLogin(userId: string, currentAttempts: number) {
    const attempts = currentAttempts + 1;
    const lockedUntil = attempts >= 5 
      ? new Date(Date.now() + 30 * 60 * 1000) // 30 min lock
      : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil,
      },
    });
  }

  private generateOtp(): string {
    // Use cryptographically secure random integer in range [100000, 999999]
    return randomInt(100000, 1000000).toString();
  }

  /**
   * Deliver the email verification code.
   *
   * In development, the code is printed to the console so you can verify
   * accounts without a real email provider.
   * TODO: Replace with real email/queue integration for production.
   */
  private async sendVerificationOtp(email: string, code: string): Promise<void> {
    if (this.configService.get('NODE_ENV') !== 'production') {
      // DEV ONLY: print OTP to console so you can verify without a mail server
      this.logger.warn(
        `[DEV] Email verification OTP for ${email}: ${code}`,
        'AuthService',
      );
    } else {
      // TODO: Replace with real email/queue integration.
      this.logger.log(`Verification OTP queued for ${email}`, 'AuthService');
    }
  }

  /**
   * Deliver the password-reset OTP.
   * Same stub pattern as sendVerificationOtp swap for real mail when ready.
   */
  private async sendPasswordResetOtp(email: string, code: string): Promise<void> {
    if (this.configService.get('NODE_ENV') !== 'production') {
      // DEV ONLY: print OTP to console so you can reset password without a mail server
      this.logger.warn(
        `[DEV] Password reset OTP for ${email}: ${code}`,
        'AuthService',
      );
    } else {
      // TODO: Replace with real email/queue integration.
      this.logger.log(`Password reset OTP queued for ${email}`, 'AuthService');
    }
  }
}
