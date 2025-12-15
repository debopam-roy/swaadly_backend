import { Module } from '@nestjs/common';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { OtpModule } from '../otp/otp.module';
import { UsersModule } from '../users/users.module';
import { TokensModule } from '../tokens/tokens.module';

@Module({
  imports: [OtpModule, UsersModule, TokensModule],
  controllers: [VerificationController],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
