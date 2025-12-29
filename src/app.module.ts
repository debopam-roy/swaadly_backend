import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OtpModule } from './modules/otp/otp.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { VerificationModule } from './modules/verification/verification.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { NewsletterModule } from './modules/newsletter/newsletter.module';
import { CommonModule } from './common/common.module';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import otpConfig from './config/otp.config';
import appConfig from './config/app.config';
import fast2smsConfig from './config/fast2sms.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, redisConfig, jwtConfig, otpConfig, fast2smsConfig],
      envFilePath: '.env.local',
    }),
    CommonModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    OtpModule,
    TokensModule,
    VerificationModule,
    ProductsModule,
    OrdersModule,
    ReviewsModule,
    ShippingModule,
    NewsletterModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
