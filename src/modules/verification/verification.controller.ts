import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { VerificationService } from './verification.service';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RequestPhoneVerificationDto } from './dto/request-phone-verification.dto';
import { VerifyPhoneDto } from './dto/verify-phone.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Verification Controller
 *
 * Handles standalone verification endpoints for email and phone.
 * These endpoints require authentication (JWT) but DO NOT issue new tokens.
 * They are used when a logged-in user needs to verify additional contact methods.
 */
@Controller('verification')
@UseGuards(ThrottlerGuard)
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * Request Email Verification OTP
   * Sends an OTP to the provided email for verification
   */
  @Post('email/request-otp')
  @HttpCode(HttpStatus.OK)
  async requestEmailVerification(
    @CurrentUser('sub') userId: string,
    @Body() dto: RequestEmailVerificationDto,
  ) {
    return this.verificationService.requestEmailVerification(userId, dto.email);
  }

  /**
   * Verify Email
   * Verifies the OTP and updates the user's email verification status
   */
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyEmailDto,
  ) {
    return this.verificationService.verifyEmail(userId, dto.email, dto.otp);
  }

  /**
   * Request Phone Verification OTP
   * Sends an OTP to the provided phone for verification
   */
  @Post('phone/request-otp')
  @HttpCode(HttpStatus.OK)
  async requestPhoneVerification(
    @CurrentUser('sub') userId: string,
    @Body() dto: RequestPhoneVerificationDto,
  ) {
    return this.verificationService.requestPhoneVerification(userId, dto.phone);
  }

  /**
   * Verify Phone
   * Verifies the OTP and updates the user's phone verification status
   */
  @Post('phone/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPhone(
    @CurrentUser('sub') userId: string,
    @Body() dto: VerifyPhoneDto,
  ) {
    return this.verificationService.verifyPhone(userId, dto.phone, dto.otp);
  }
}
