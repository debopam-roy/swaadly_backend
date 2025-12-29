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
import { generateInitialsAvatar } from '../../../common/utils/avatar.util';

@Injectable()
export class PhoneAuthStrategy implements IAuthStrategy {
  private readonly logger = new Logger(PhoneAuthStrategy.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  async initiateAuth(data: { phone: string }): Promise<InitiateAuthResponse> {
    const { phone } = data;

    // Validate phone format (E.164)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_PHONE);
    }

    // Request phone OTP
    await this.otpService.requestOtp(OtpType.PHONE, phone);

    this.logger.debug(`Phone OTP requested for: ${phone}`);

    return {
      message: 'OTP sent to your phone',
      requiresOtp: true,
      otpSentTo: phone,
      nextStep: 'verify-phone-otp',
    };
  }

  async verifyAuth(data: {
    phone: string;
    otp: string;
  }): Promise<VerifyAuthResponse> {
    const { phone, otp } = data;

    // Verify phone OTP
    await this.otpService.verifyOtp(OtpType.PHONE, phone, otp);
    this.logger.debug(`Phone verified for: ${phone}`);

    // Find or create auth record
    let auth = await this.usersService.findByPhone(phone);

    if (!auth) {
      // Create new auth with phone only (also creates user profile)
      auth = await this.usersService.create({
        phone,
        phoneVerified: true,
        emailVerified: false,
      });
      this.logger.debug(`New auth created with phone: ${phone}`);

      // Generate initial avatar from phone number
      if (auth.user) {
        const displayName = `User${phone.slice(-4)}`; // Use last 4 digits
        const avatarUrl = generateInitialsAvatar({ name: displayName });

        await this.usersService.updateUserProfile(auth.id, {
          displayName,
          avatarUrl,
        });
      }
    } else {
      // Update existing auth to mark phone as verified
      await this.usersService.update(auth.id, { phoneVerified: true });
      auth = await this.usersService.findById(auth.id);
    }

    if (!auth) {
      throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Update last login
    await this.usersService.updateLastLogin(auth.id);

    // Generate tokens
    const accessToken = await this.tokensService.generateAccessToken({
      sub: auth.id,
      email: auth.email ?? undefined,
      phone: auth.phone ?? undefined,
      emailVerified: auth.emailVerified,
      phoneVerified: auth.phoneVerified,
    });

    const { token: refreshToken } =
      await this.tokensService.generateRefreshToken(auth.id);

    this.logger.debug(`Phone authentication successful for auth: ${auth.id}`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: auth.id,
        email: auth.email ?? undefined,
        phone: auth.phone ?? undefined,
        emailVerified: auth.emailVerified,
        phoneVerified: auth.phoneVerified,
      },
    };
  }
}
