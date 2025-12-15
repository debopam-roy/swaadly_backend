import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokensService } from '../../modules/tokens/tokens.service';
import { ERROR_MESSAGES } from '../constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly tokensService: TokensService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('No authorization header found');
      throw new UnauthorizedException(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = await this.tokensService.verifyAccessToken(token);
      request.user = payload; // Attach user payload to request
      return true;
    } catch (error) {
      this.logger.warn('Invalid token provided');
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }
  }
}
