import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '../../users/users.service';
import { TokensService } from '../../tokens/tokens.service';
import {
  IAuthStrategy,
  InitiateAuthResponse,
  VerifyAuthResponse,
} from './interfaces/auth-strategy.interface';
import { ERROR_MESSAGES } from '../../../common/constants';

@Injectable()
export class GoogleAuthStrategy implements IAuthStrategy {
  private readonly logger = new Logger(GoogleAuthStrategy.name);
  private googleClient: OAuth2Client;

  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
    private readonly configService: ConfigService,
  ) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(clientId);
  }

  async initiateAuth(data: { idToken: string }): Promise<InitiateAuthResponse> {
    // Google auth doesn't need initiation since token comes from frontend
    // This method is here to satisfy the interface but won't be used
    return {
      message: 'Use verifyAuth to complete Google authentication',
      requiresOtp: false,
      nextStep: 'verify-google-token',
    };
  }

  async verifyAuth(data: { idToken: string }): Promise<VerifyAuthResponse> {
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
    const name = payload.name;
    const picture = payload.picture;

    if (!email) {
      throw new BadRequestException(ERROR_MESSAGES.GOOGLE_EMAIL_NOT_FOUND);
    }

    this.logger.debug(`Google authentication successful for: ${email}`);

    // Find or create auth record
    let auth = await this.usersService.findByGoogleId(googleId);

    if (!auth) {
      auth = await this.usersService.findByEmail(email);
    }

    if (!auth) {
      // Create new auth with Google credentials (also creates user profile)
      auth = await this.usersService.create({
        email,
        googleId,
        emailVerified: true, // Trust Google's email verification
        phoneVerified: false,
      });

      // Pre-fill user profile with Google data if available
      if (auth.user && (name || picture)) {
        const nameParts = name?.split(' ') || [];
        await this.usersService.updateUserProfile(auth.id, {
          firstName: nameParts[0] || undefined,
          lastName: nameParts.slice(1).join(' ') || undefined,
          displayName: name || undefined,
          avatarUrl: picture || undefined,
        });
      }

      this.logger.debug(`New auth created via Google: ${auth.id}`);
    } else {
      // Update existing auth with Google ID if not already set
      const updateData: any = { emailVerified: true };
      if (!auth.googleId) {
        updateData.googleId = googleId;
      }
      await this.usersService.update(auth.id, updateData);

      // Update user profile with Google data if onboarding not completed
      if (auth.user && !auth.user.onboardingCompleted && (name || picture)) {
        const nameParts = name?.split(' ') || [];
        await this.usersService.updateUserProfile(auth.id, {
          firstName: auth.user.firstName || nameParts[0] || undefined,
          lastName: auth.user.lastName || nameParts.slice(1).join(' ') || undefined,
          displayName: auth.user.displayName || name || undefined,
          avatarUrl: auth.user.avatarUrl || picture || undefined,
        });
      }

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
}
