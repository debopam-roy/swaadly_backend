import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
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
export class GooglePhoneAuthStrategy implements IAuthStrategy {
  private readonly logger = new Logger(GooglePhoneAuthStrategy.name);
  private googleClient: OAuth2Client;

  constructor(
    private readonly otpService: OtpService,
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(clientId);
  }

  async initiateAuth(data: { idToken: string }): Promise<InitiateAuthResponse> {
    const { idToken } = data;

    // Verify Google ID token
    let ticket;
    try {
      ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get<string>('GOOGLE_CLIENT_ID'),
      });
    } catch (error) {
      this.logger.error('Google token verification failed:', error.message);
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_GOOGLE_TOKEN);
    }

    const payload = ticket.getPayload();
    const email = payload.email;
    const googleId = payload.sub;

    if (!email) {
      throw new BadRequestException(ERROR_MESSAGES.GOOGLE_EMAIL_NOT_FOUND);
    }

    this.logger.debug(`Google authentication successful for: ${email}`);

    // Check if auth exists by Google ID or email
    let auth = await this.usersService.findByGoogleId(googleId);
    if (!auth) {
      auth = await this.usersService.findByEmail(email);
    }

    // Return authId for phone verification step
    const userId = auth?.id;

    return {
      message: 'Google authentication successful. Phone verification required.',
      requiresOtp: true,
      nextStep: 'provide-phone-number',
      userId,
      otpSentTo: email,
    };
  }

  async verifyAuth(data: {
    email: string;
    googleId: string;
    phone: string;
    otp: string;
  }): Promise<VerifyAuthResponse> {
    const { email, googleId, phone, otp } = data;

    // Verify phone OTP
    await this.otpService.verifyOtp(OtpType.PHONE, phone, otp);
    this.logger.debug(`Phone verified for: ${phone}`);

    // Find or create auth record
    let auth = await this.usersService.findByGoogleId(googleId);

    if (!auth) {
      auth = await this.usersService.findByEmail(email);
    }

    if (!auth) {
      // Create new auth (also creates user profile)
      auth = await this.usersService.create({
        email,
        phone,
        googleId,
        emailVerified: true, // Trust Google's email verification
        phoneVerified: true,
      });
      this.logger.debug(`New auth created via Google: ${auth.id}`);
    } else {
      // Update existing auth
      await this.usersService.update(auth.id, {
        googleId,
        phone,
        emailVerified: true,
        phoneVerified: true,
      });
      auth = await this.usersService.findById(auth.id);
    }

    // Ensure auth exists at this point
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

    this.logger.debug(`Google authentication successful for auth: ${auth.id}`);

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

  async requestPhoneOtp(phone: string): Promise<void> {
    await this.otpService.requestOtp(OtpType.PHONE, phone);
    this.logger.debug(`Phone OTP requested for Google auth: ${phone}`);
  }
}
