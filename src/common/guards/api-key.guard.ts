import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * API Key Guard for internal/cron endpoints
 *
 * Usage:
 * 1. Set INTERNAL_API_KEY in environment variables
 * 2. Apply @UseGuards(ApiKeyGuard) to endpoints
 * 3. Send requests with header: x-api-key: YOUR_API_KEY
 *
 * This is more suitable for server-to-server authentication
 * than JWT tokens which are designed for user sessions
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    const validApiKey = this.configService.get<string>('INTERNAL_API_KEY');

    if (!validApiKey) {
      this.logger.error(
        'INTERNAL_API_KEY not configured in environment variables',
      );
      throw new UnauthorizedException('API key authentication not configured');
    }

    if (!apiKey) {
      this.logger.warn('No API key provided in x-api-key header');
      throw new UnauthorizedException('API key required');
    }

    if (apiKey !== validApiKey) {
      this.logger.warn('Invalid API key provided');
      throw new UnauthorizedException('Invalid API key');
    }

    this.logger.debug('API key authentication successful');
    return true;
  }
}
