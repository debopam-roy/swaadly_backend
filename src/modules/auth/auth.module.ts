import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailAuthStrategy } from './strategies/email-auth.strategy';
import { PhoneAuthStrategy } from './strategies/phone-auth.strategy';
import { GoogleAuthStrategy } from './strategies/google-auth.strategy';
import { UsersModule } from '../users/users.module';
import { OtpModule } from '../otp/otp.module';
import { TokensModule } from '../tokens/tokens.module';
import throttlerConfig from '../../config/throttler.config';

@Module({
  imports: [
    ConfigModule.forFeature(throttlerConfig),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('throttler.ttl', 60000),
          limit: configService.get<number>('throttler.limit', 10),
        },
      ],
    }),
    UsersModule,
    OtpModule,
    TokensModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: 'EMAIL_STRATEGY',
      useClass: EmailAuthStrategy,
    },
    {
      provide: 'PHONE_STRATEGY',
      useClass: PhoneAuthStrategy,
    },
    EmailAuthStrategy,
    PhoneAuthStrategy,
    GoogleAuthStrategy,
  ],
  exports: [AuthService, TokensModule],
})
export class AuthModule {}
