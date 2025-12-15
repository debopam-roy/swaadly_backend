import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IOtpStorage } from './interfaces/otp-storage.interface';
import type { IOtpProvider } from './interfaces/otp-provider.interface';
import { OtpType } from './interfaces/otp-provider.interface';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../common/constants';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @Inject('OTP_STORAGE') private readonly otpStorage: IOtpStorage,
    @Inject('EMAIL_OTP_PROVIDER') private readonly emailOtpProvider: IOtpProvider,
    @Inject('SMS_OTP_PROVIDER') private readonly smsOtpProvider: IOtpProvider,
    private readonly configService: ConfigService,
  ) {}

  async requestOtp(
    type: OtpType,
    identifier: string,
  ): Promise<{ message: string }> {

    // Check rate limiting
    const rateLimitCount = await this.otpStorage.getRateLimitCount(identifier);
    const maxRequests = this.configService.get('otp.rateLimitMax');

    if (rateLimitCount >= maxRequests) {
      this.logger.warn(`Rate limit exceeded for: ${identifier}`);
      throw new HttpException(
        ERROR_MESSAGES.TOO_MANY_OTP_REQUESTS,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Select provider based on type
    const provider = type === OtpType.EMAIL ? this.emailOtpProvider : this.smsOtpProvider;

    // Generate OTP
    const code = provider.generateOtp();

    // Store OTP in Redis
    const ttl = this.configService.get('otp.expiresIn');
    await this.otpStorage.store(identifier, code, ttl);

    // Send OTP via provider
    await provider.sendOtp(identifier, code);

    // Increment rate limit
    const rateLimitWindow = this.configService.get('otp.rateLimitWindow');
    await this.otpStorage.incrementRateLimit(identifier, rateLimitWindow);

    const message =
      type === OtpType.EMAIL
        ? SUCCESS_MESSAGES.OTP_SENT_EMAIL
        : SUCCESS_MESSAGES.OTP_SENT_PHONE;

    return { message };
  }

  async verifyOtp(
    type: OtpType,
    identifier: string,
    code: string,
  ): Promise<boolean> {
    // Verify OTP
    const isValid = await this.otpStorage.verify(identifier, code);

    if (!isValid) {
      // Increment attempts
      const attempts = await this.otpStorage.incrementAttempts(identifier);
      const maxAttempts = this.configService.get('otp.maxAttempts');

      this.logger.warn(
        `Invalid OTP attempt ${attempts}/${maxAttempts} for: ${identifier}`,
      );

      if (attempts >= maxAttempts) {
        await this.otpStorage.delete(identifier);
        throw new BadRequestException(ERROR_MESSAGES.OTP_MAX_ATTEMPTS);
      }

      throw new BadRequestException(ERROR_MESSAGES.OTP_INVALID);
    }

    // Delete OTP after successful verification
    await this.otpStorage.delete(identifier);
    this.logger.debug(`OTP verified successfully for: ${identifier}`);

    return true;
  }
}
