import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { OtpService } from '../../otp/otp.service';
import { OtpType } from '../../otp/interfaces/otp-provider.interface';
import { UsersService } from '../../users/users.service';
import { TokensService } from '../../tokens/tokens.service';
import {
  IAuthStrategy,
  InitiateAuthResponse,
  VerifyAuthResponse,
} from './interfaces/auth-strategy.interface';
import { ERROR_MESSAGES } from '../../../common/constants';

@Injectable()
export class EmailPhoneAuthStrategy implements IAuthStrategy {
  private readonly logger = new Logger(EmailPhoneAuthStrategy.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  async initiateAuth(data: { email: string }): Promise<InitiateAuthResponse> {
    const { email } = data;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_EMAIL);
    }

    // Request email OTP
    await this.otpService.requestOtp(OtpType.EMAIL, email);

    return {
      message: 'OTP sent to your email',
      requiresOtp: true,
      otpSentTo: email,
      nextStep: 'verify-email-otp',
    };
  }

  async verifyAuth(data: {
    email: string;
    emailOtp: string;
    phone?: string;
    phoneOtp?: string;
  }): Promise<VerifyAuthResponse> {
    const { email, emailOtp, phone, phoneOtp } = data;

    // Step 1: Verify email OTP
    await this.otpService.verifyOtp(OtpType.EMAIL, email, emailOtp);

    // Step 2: Create or update auth with verified email
    let auth = await this.usersService.findByEmail(email);

    if (!auth && !phone) {
      throw new BadRequestException(ERROR_MESSAGES.PHONE_REQUIRED);
    }

    if (!auth && phone) {
      auth = await this.usersService.create({
        email,
        phone,
        emailVerified: true,
        phoneVerified: false,
      });
    } else if (auth) {
      await this.usersService.update(auth.id, { emailVerified: true });
      auth = await this.usersService.findById(auth.id);
    }

    // Step 3: Handle phone verification
    if (!phoneOtp) {
      // Send phone OTP
      const phoneToVerify = phone || auth?.phone || '';
      await this.otpService.requestOtp(OtpType.PHONE, phoneToVerify);

      return {
        accessToken: '',
        refreshToken: '',
        user: {
          id: '',
          email: '',
          phone: '',
          emailVerified: false,
          phoneVerified: false,
        },
        requiresPhoneVerification: true,
      };
    }

    // Ensure auth exists at this point
    if (!auth) {
      throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Verify phone OTP
    const phoneToVerify = phone || auth.phone || '';
    if (!phoneToVerify) {
      throw new BadRequestException(ERROR_MESSAGES.PHONE_REQUIRED);
    }
    await this.otpService.verifyOtp(OtpType.PHONE, phoneToVerify, phoneOtp);

    // Update auth with verified phone
    if (phone && phone !== auth.phone) {
      await this.usersService.update(auth.id, {
        phone,
        phoneVerified: true,
      });
    } else {
      await this.usersService.update(auth.id, { phoneVerified: true });
    }

    // Update last login
    await this.usersService.updateLastLogin(auth.id);

    // Get updated auth
    const updatedAuth = await this.usersService.findById(auth.id);

    if (!updatedAuth) {
      throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Generate tokens
    const accessToken = await this.tokensService.generateAccessToken({
      sub: updatedAuth.id,
      email: updatedAuth.email ?? undefined,
      phone: updatedAuth.phone ?? undefined,
      emailVerified: updatedAuth.emailVerified,
      phoneVerified: updatedAuth.phoneVerified,
    });

    const { token: refreshToken } =
      await this.tokensService.generateRefreshToken(updatedAuth.id);

    this.logger.debug(`Authentication successful for auth: ${updatedAuth.id}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: updatedAuth.id,
        email: updatedAuth.email ?? undefined,
        phone: updatedAuth.phone ?? undefined,
        emailVerified: updatedAuth.emailVerified,
        phoneVerified: updatedAuth.phoneVerified,
      },
    };
  }
}
