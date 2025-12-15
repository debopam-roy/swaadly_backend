import { registerAs } from '@nestjs/config';

export default registerAs('throttler', () => ({
  ttl: parseInt(process.env.THROTTLER_TTL || '60000', 10), // 60 seconds
  limit: parseInt(process.env.THROTTLER_LIMIT || '100', 10), // 100 requests per minute
}));