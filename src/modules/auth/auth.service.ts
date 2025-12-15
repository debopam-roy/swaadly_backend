import { Injectable, Inject, Logger } from '@nestjs/common';
import type {
  IAuthStrategy,
  InitiateAuthResponse,
  VerifyAuthResponse,
} from './strategies/interfaces/auth-strategy.interface';
import { TokensService } from '../tokens/tokens.service';
import { GoogleAuthStrategy } from './strategies/google-auth.strategy';

/**
 * Auth Service
 *
 * Handles three independent authentication methods:
 * 1. Email Authentication - OTP verification with JWT creation
 * 2. Phone Authentication - OTP verification with JWT creation
 * 3. Google Authentication - OAuth verification with JWT creation
 *
 * Each method is completely independent and creates access/refresh tokens.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject('EMAIL_STRATEGY')
    private readonly emailStrategy: IAuthStrategy,
    @Inject('PHONE_STRATEGY')
    private readonly phoneStrategy: IAuthStrategy,
    private readonly googleStrategy: GoogleAuthStrategy,
    private readonly tokensService: TokensService,
  ) {}

  // Email Authentication
  async initiateEmailAuth(email: string): Promise<InitiateAuthResponse> {
    this.logger.debug(`Initiating email auth for: ${email}`);
    return this.emailStrategy.initiateAuth({ email });
  }

  async verifyEmailAuth(data: {
    email: string;
    otp: string;
  }): Promise<VerifyAuthResponse> {
    return this.emailStrategy.verifyAuth(data);
  }

  // Phone Authentication
  async initiatePhoneAuth(phone: string): Promise<InitiateAuthResponse> {
    this.logger.debug(`Initiating phone auth for: ${phone}`);
    return this.phoneStrategy.initiateAuth({ phone });
  }

  async verifyPhoneAuth(data: {
    phone: string;
    otp: string;
  }): Promise<VerifyAuthResponse> {
    return this.phoneStrategy.verifyAuth(data);
  }

  // Google Authentication
  async verifyGoogleAuth(idToken: string): Promise<VerifyAuthResponse> {
    this.logger.debug('Verifying Google authentication');
    return this.googleStrategy.verifyAuth({ idToken });
  }

  // Token Management
  async refreshToken(refreshToken: string) {
    this.logger.debug('Refreshing tokens');
    return this.tokensService.refreshAccessToken(refreshToken);
  }

  async logout(refreshToken: string) {
    this.logger.debug('User logging out');
    return this.tokensService.revokeRefreshToken(refreshToken);
  }
}
