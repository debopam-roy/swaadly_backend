import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { OtpService } from '../otp/otp.service';
import { OtpType } from '../otp/interfaces/otp-provider.interface';
import { UsersService } from '../users/users.service';
import { ERROR_MESSAGES } from '../../common/constants';

/**
 * Verification Service
 *
 * Handles standalone email and phone verification for existing users.
 * These endpoints DO NOT create JWT tokens - they only verify and update
 * the verification status in the database.
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Request Email Verification OTP
   * Sends OTP to the user's email for verification purposes
   */
  async requestEmailVerification(userId: string, email: string): Promise<{ message: string }> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_EMAIL);
    }

    // Verify user exists
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if email is already taken by another user
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    // Send OTP
    await this.otpService.requestOtp(OtpType.EMAIL, email);

    this.logger.debug(`Email verification OTP sent to: ${email} for user: ${userId}`);

    return { message: 'Verification OTP sent to your email' };
  }

  /**
   * Verify Email OTP
   * Verifies the OTP and updates the user's email and emailVerified status
   */
  async verifyEmail(userId: string, email: string, otp: string): Promise<{ message: string; emailVerified: boolean }> {
    // Verify user exists
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Verify OTP
    await this.otpService.verifyOtp(OtpType.EMAIL, email, otp);

    // Check if email is already taken by another user
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
    }

    // Update user's email and verification status
    await this.usersService.update(userId, {
      email,
      emailVerified: true,
    });

    this.logger.debug(`Email verified for user: ${userId}`);

    return {
      message: 'Email verified successfully',
      emailVerified: true,
    };
  }

  /**
   * Request Phone Verification OTP
   * Sends OTP to the user's phone for verification purposes
   */
  async requestPhoneVerification(userId: string, phone: string): Promise<{ message: string }> {
    // Validate phone format (E.164)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PHONE);
    }

    // Verify user exists
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Check if phone is already taken by another user
    const existingUser = await this.usersService.findByPhone(phone);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException(ERROR_MESSAGES.PHONE_ALREADY_EXISTS);
    }

    // Send OTP
    await this.otpService.requestOtp(OtpType.PHONE, phone);

    this.logger.debug(`Phone verification OTP sent to: ${phone} for user: ${userId}`);

    return { message: 'Verification OTP sent to your phone' };
  }

  /**
   * Verify Phone OTP
   * Verifies the OTP and updates the user's phone and phoneVerified status
   */
  async verifyPhone(userId: string, phone: string, otp: string): Promise<{ message: string; phoneVerified: boolean }> {
    // Verify user exists
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Verify OTP
    await this.otpService.verifyOtp(OtpType.PHONE, phone, otp);

    // Check if phone is already taken by another user
    const existingUser = await this.usersService.findByPhone(phone);
    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException(ERROR_MESSAGES.PHONE_ALREADY_EXISTS);
    }

    // Update user's phone and verification status
    await this.usersService.update(userId, {
      phone,
      phoneVerified: true,
    });

    this.logger.debug(`Phone verified for user: ${userId}`);

    return {
      message: 'Phone verified successfully',
      phoneVerified: true,
    };
  }
}
