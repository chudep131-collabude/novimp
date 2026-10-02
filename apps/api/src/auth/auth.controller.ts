import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Get,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TelegramLoginDto } from './dto/telegram-login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
  ) {
    return this.authService.register(
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('verify-email')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ) {
    return this.authService.login(
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('telegram')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @HttpCode(HttpStatus.OK)
  async telegramLogin(
    @Body() dto: TelegramLoginDto,
    @Req() req: Request,
  ) {
    return this.authService.loginWithTelegram(
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('refresh')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('sub') userId: string,
    @Req() req: Request,
  ) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    return this.authService.logout(userId, token);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser('sub') userId: string) {
    return this.authService.logoutAll(userId);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 per minute
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser('sub') userId: string) {
    // Handled by UsersModule, this is just a route alias
    return { userId };
  }
}
