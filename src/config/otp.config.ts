import { registerAs } from '@nestjs/config';

export default registerAs('otp', () => ({
  length: parseInt(process.env.OTP_LENGTH || '6', 10),
  expiresIn: parseInt(process.env.OTP_EXPIRES_IN || '1800', 10), // 5 minutes
  maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '3', 10),
  rateLimitWindow: 3600, // 1 hour in seconds
  rateLimitMax: 30, // 5 OTP requests per hour
}));
