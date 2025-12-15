import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { OtpService } from './otp.service';
import { RedisOtpStorage } from './storage/redis-otp.storage';
import { ResendEmailProvider } from './providers/resend-email.provider';
import { Fast2SmsProvider } from './providers/fast2sms.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get('redis') || {
          host: 'localhost',
          port: 6379,
        };
        return new Redis(redisConfig);
      },
      inject: [ConfigService],
    },
    {
      provide: 'OTP_STORAGE',
      useClass: RedisOtpStorage,
    },
    {
      provide: 'EMAIL_OTP_PROVIDER',
      useClass: ResendEmailProvider,
    },
    {
      provide: 'SMS_OTP_PROVIDER',
      useClass: Fast2SmsProvider,
    },
    RedisOtpStorage,
    ResendEmailProvider,
    Fast2SmsProvider,
    OtpService,
  ],
  exports: [OtpService],
})
export class OtpModule {}
