import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { authenticator } from 'otplib';
import { IOtpProvider } from '../interfaces/otp-provider.interface';

interface Fast2SmsResponse {
  return: boolean;
  message?: string;
  request_id?: string;
}

interface Fast2SmsRequestPayload {
  route: string;
  sender_id: string;
  message: string;
  variables_values: string;
  numbers: string;
  flash?: 0 | 1;
}

@Injectable()
export class Fast2SmsProvider implements IOtpProvider {
  private readonly logger = new Logger(Fast2SmsProvider.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly apiUrl: string;
  private readonly route: string;
  private readonly templateId: string;

  constructor(private readonly configService: ConfigService) {
    // Get Fast2SMS config from the config module
    this.apiKey = this.configService.get<string>('fast2sms.apiKey') || '';
    this.senderId = this.configService.get<string>('fast2sms.senderId') || 'SWADLY';
    this.apiUrl = this.configService.get<string>('fast2sms.apiUrl') || 'https://www.fast2sms.com/dev/bulkV2';
    this.route = this.configService.get<string>('fast2sms.route') || 'dlt';
    this.templateId = this.configService.get<string>('fast2sms.templateId') || '';

    if (!this.apiKey) {
      this.logger.warn('Fast2SMS API Key is not configured. SMS sending will fail.');
    }

    if (!this.templateId) {
      this.logger.warn('Fast2SMS Template ID is not configured. Using default message format.');
    }

    // Configure OTP authenticator
    authenticator.options = {
      digits: this.configService.get('otp.length', 6),
    };
  }

  generateOtp(): string {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);
    return token;
  }

  async sendOtp(recipient: string, code: string): Promise<void> {
    try {
      const sanitizedPhone = this.sanitizePhoneNumber(recipient);
      this.validatePhoneNumber(sanitizedPhone);

      const response = await this.sendSms(sanitizedPhone, code);

      if (response.return === false) {
        throw new InternalServerErrorException(
          response.message || 'Failed to send SMS via Fast2SMS',
        );
      }

      this.logger.debug(
        `OTP sent successfully to phone: ${this.maskPhoneNumber(recipient)} (Request ID: ${response.request_id})`,
      );
    } catch (error) {
      this.handleError(error, recipient);
    }
  }

  private async sendSms(
    phone: string,
    code: string,
  ): Promise<Fast2SmsResponse> {
    // For DLT route, we use template variables instead of full message
    // The template should be pre-registered with Fast2SMS DLT
    // Template format: "Dear User, Kindly use {#var#} as OTP for your login on our Website. Do not share it with anyone. Regards, Swaadly Foods Pvt Ltd."
    // We send the OTP code as the variable value
    const payload: Fast2SmsRequestPayload = {
      route: this.route,
      sender_id: this.senderId,
      message: this.templateId || '204491', // DLT Template ID from screenshot
      variables_values: code, // Only the OTP code as variable
      numbers: phone,
      flash: 0,
    };

    const config: AxiosRequestConfig = {
      method: 'POST',
      url: this.apiUrl,
      headers: {
        accept: 'application/json',
        authorization: this.apiKey,
        'content-type': 'application/json',
      },
      data: payload,
      timeout: 10000,
    };

    this.logger.debug(`Sending SMS to ${this.maskPhoneNumber(phone)} with template ${payload.message}`);

    const response = await axios.request<Fast2SmsResponse>(config);
    return response.data;
  }

  private sanitizePhoneNumber(phone: string): string {
    return phone.replace(/^\+?91/, '').replace(/[^\d]/g, '');
  }

  private validatePhoneNumber(phone: string): void {
    if (!/^\d{10}$/.test(phone)) {
      throw new InternalServerErrorException(
        'Invalid phone number format. Must be 10 digits.',
      );
    }
  }

  private maskPhoneNumber(phone: string): string {
    const sanitized = this.sanitizePhoneNumber(phone);
    if (sanitized.length >= 10) {
      return `******${sanitized.slice(-4)}`;
    }
    return '****';
  }

  private handleError(error: unknown, recipient: string): never {
    const maskedRecipient = this.maskPhoneNumber(recipient);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<Fast2SmsResponse>;

      if (axiosError.response) {
        const statusCode = axiosError.response.status;
        const errorMessage =
          axiosError.response.data?.message || 'Unknown error from Fast2SMS';

        this.logger.error(
          `Fast2SMS API error (${statusCode}): ${errorMessage} for ${maskedRecipient}`,
        );

        throw new InternalServerErrorException(
          'Failed to send OTP. Please try again.',
        );
      }

      if (axiosError.request) {
        this.logger.error(
          `No response from Fast2SMS API for ${maskedRecipient}`,
        );
        throw new InternalServerErrorException(
          'SMS service temporarily unavailable. Please try again.',
        );
      }
    }

    this.logger.error(
      `Unexpected error sending OTP to ${maskedRecipient}:`,
      error instanceof Error ? error.message : 'Unknown error',
    );

    throw new InternalServerErrorException(
      'Failed to send OTP. Please try again.',
    );
  }
}
