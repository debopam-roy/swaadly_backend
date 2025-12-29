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
export class EmailAuthStrategy implements IAuthStrategy {
  private readonly logger = new Logger(EmailAuthStrategy.name);

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

    this.logger.debug(`Email OTP sent to: ${email}`);

    return {
      message: 'OTP sent to your email',
      requiresOtp: true,
      otpSentTo: email,
      nextStep: 'verify-email-otp',
    };
  }

  async verifyAuth(data: {
    email: string;
    otp: string;
  }): Promise<VerifyAuthResponse> {
    const { email, otp } = data;

    // Verify email OTP
    await this.otpService.verifyOtp(OtpType.EMAIL, email, otp);
    this.logger.debug(`Email verified for: ${email}`);

    // Find or create auth record
    let auth = await this.usersService.findByEmail(email);

    if (!auth) {
      // Create new auth with email only (also creates user profile)
      auth = await this.usersService.create({
        email,
        emailVerified: true,
        phoneVerified: false,
      });
      this.logger.debug(`New auth created with email: ${email}`);

      // Generate initial avatar from email username
      if (auth.user) {
        const displayName = email.split('@')[0];
        const avatarUrl = generateInitialsAvatar({ name: displayName });

        await this.usersService.updateUserProfile(auth.id, {
          displayName,
          avatarUrl,
        });
      }
    } else {
      // Update existing auth to mark email as verified
      await this.usersService.update(auth.id, { emailVerified: true });
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

    this.logger.debug(`Email authentication successful for auth: ${auth.id}`);

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
