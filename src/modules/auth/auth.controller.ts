import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { EmailOtpRequestDto } from './dto/email-otp-request.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { PhoneOtpRequestDto } from './dto/phone-otp-request.dto';
import { VerifyPhoneOtpDto } from './dto/verify-phone-otp.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Auth Controller
 *
 * Handles three independent authentication methods:
 * 1. Email Authentication - Returns JWT tokens
 * 2. Phone Authentication - Returns JWT tokens
 * 3. Google Authentication - Returns JWT tokens
 *
 * For verification of additional contact methods (without authentication),
 * use the /verification endpoints instead.
 */
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==================== Email Authentication ====================
  /**
   * Request Email OTP for Authentication
   * Sends OTP to email. After verification, user receives JWT tokens.
   */
  @Public()
  @Post('email/request-otp')
  @HttpCode(HttpStatus.OK)
  async requestEmailOtp(@Body() dto: EmailOtpRequestDto) {
    return this.authService.initiateEmailAuth(dto.email);
  }

  /**
   * Verify Email OTP and Login
   * Verifies OTP and returns access + refresh tokens
   */
  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmailOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.authService.verifyEmailAuth({
      email: dto.email,
      otp: dto.emailOtp,
    });
  }

  // ==================== Phone Authentication ====================
  /**
   * Request Phone OTP for Authentication
   * Sends OTP to phone. After verification, user receives JWT tokens.
   */
  @Public()
  @Post('phone/request-otp')
  @HttpCode(HttpStatus.OK)
  async requestPhoneOtp(@Body() dto: PhoneOtpRequestDto) {
    return this.authService.initiatePhoneAuth(dto.phone);
  }

  /**
   * Verify Phone OTP and Login
   * Verifies OTP and returns access + refresh tokens
   */
  @Public()
  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPhoneOtp(@Body() dto: VerifyPhoneOtpDto) {
    return this.authService.verifyPhoneAuth({
      phone: dto.phone,
      otp: dto.otp,
    });
  }

  // ==================== Google Authentication ====================
  /**
   * Google Authentication
   * Verifies Google ID token and returns access + refresh tokens
   */
  @Public()
  @Post('google/verify')
  @HttpCode(HttpStatus.OK)
  async verifyGoogleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.verifyGoogleAuth(dto.idToken);
  }

  // ==================== Token Management ====================
  /**
   * Refresh Access Token
   * Uses refresh token to get a new access token
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  /**
   * Logout
   * Revokes the refresh token
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return { message: 'Logged out successfully' };
  }
}
