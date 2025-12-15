import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  ITokenPayload,
  IRefreshTokenPayload,
} from '../../common/interfaces';
import { ERROR_MESSAGES } from '../../common/constants';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async generateAccessToken(payload: ITokenPayload): Promise<string> {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('jwt.accessSecret'),
      expiresIn: this.configService.get('jwt.accessExpiresIn'),
    });
  }

  async generateRefreshToken(
    authId: string,
    deviceInfo?: any,
  ): Promise<{ token: string; sessionId: string }> {
    // Create temporary payload for token
    const tempPayload: IRefreshTokenPayload = {
      sub: authId,
      sessionId: 'temp',
    };

    const token = this.jwtService.sign(tempPayload, {
      secret: this.configService.get('jwt.refreshSecret'),
      expiresIn: this.configService.get('jwt.refreshExpiresIn'),
    });

    // Hash token
    const tokenHash = await bcrypt.hash(token, 10);

    // Store session
    const session = await this.prisma.authSession.create({
      data: {
        authId,
        refreshTokenHash: tokenHash,
        deviceInfo,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    this.logger.debug(`Refresh token created for auth: ${authId}`);

    return { token, sessionId: session.id };
  }

  async verifyAccessToken(token: string): Promise<ITokenPayload> {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get('jwt.accessSecret'),
      });
    } catch (error) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }
  }

  async verifyRefreshToken(token: string): Promise<IRefreshTokenPayload> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      // Find active sessions for auth
      const sessions = await this.prisma.authSession.findMany({
        where: {
          authId: payload.sub,
          revoked: false,
        },
      });

      // Check if token matches any session
      let matchedSession: typeof sessions[0] | null = null;
      for (const session of sessions) {
        const isValid = await bcrypt.compare(token, session.refreshTokenHash);
        if (isValid) {
          matchedSession = session;
          break;
        }
      }

      if (!matchedSession) {
        throw new UnauthorizedException(ERROR_MESSAGES.SESSION_NOT_FOUND);
      }

      // Check expiration
      if (matchedSession.expiresAt < new Date()) {
        throw new UnauthorizedException(ERROR_MESSAGES.TOKEN_EXPIRED);
      }

      return { ...payload, sessionId: matchedSession.id };
    } catch (error) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify refresh token
    const payload = await this.verifyRefreshToken(refreshToken);

    // Get auth record
    const auth = await this.prisma.auth.findUnique({
      where: { id: payload.sub },
    });

    if (!auth) {
      throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    // Generate new access token
    const accessPayload: ITokenPayload = {
      sub: auth.id,
      email: auth.email ?? undefined,
      phone: auth.phone ?? undefined,
      emailVerified: auth.emailVerified,
      phoneVerified: auth.phoneVerified,
    };

    const accessToken = await this.generateAccessToken(accessPayload);

    // Rotate refresh token
    await this.revokeRefreshToken(refreshToken);
    const { token: newRefreshToken } = await this.generateRefreshToken(
      auth.id,
    );

    this.logger.debug(`Tokens refreshed for auth: ${auth.id}`);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const payload = await this.verifyRefreshToken(token);
    await this.prisma.authSession.update({
      where: { id: payload.sessionId },
      data: { revoked: true },
    });

    this.logger.debug(`Session revoked: ${payload.sessionId}`);
  }

  async revokeAllUserSessions(authId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { authId, revoked: false },
      data: { revoked: true },
    });

    this.logger.debug(`All sessions revoked for auth: ${authId}`);
  }
}
