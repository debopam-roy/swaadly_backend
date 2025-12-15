import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { authenticator } from 'otplib';
import { IOtpProvider } from '../interfaces/otp-provider.interface';

@Injectable()
export class ResendEmailProvider implements IOtpProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly resend: Resend;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);

    authenticator.options = {
      digits: this.configService.get('otp.length'),
    };
  }

  generateOtp(): string {
    const secret = authenticator.generateSecret();
    const token = authenticator.generate(secret);
    return token;
  }

  async sendOtp(recipient: string, code: string): Promise<void> {
    try {
      const fromEmail = this.configService.get<string>('RESEND_FROM_EMAIL') || 'noreply@swaadly.com';
      const expiresIn = this.configService.get('otp.expiresIn') / 60;


      await this.resend.emails.send({
        from: fromEmail,
        to: recipient,
        subject: 'Your Swaadly Verification Code',
        html: this.getEmailTemplate(code, expiresIn),
      });

      this.logger.debug(`OTP sent to email: ${recipient}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${recipient}:`, error);
      throw error;
    }
  }

  private getEmailTemplate(code: string, expiresIn: number): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background-color: #4F46E5; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Swaadly</h1>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0;">Verification Code</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.5; margin: 0 0 30px 0;">
                Your verification code is:
              </p>
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; margin: 0 0 30px 0;">
                <h1 style="font-size: 36px; letter-spacing: 8px; color: #4F46E5; margin: 0; font-family: 'Courier New', monospace;">
                  ${code}
                </h1>
              </div>
              <p style="color: #666666; font-size: 14px; line-height: 1.5; margin: 0 0 10px 0;">
                This code will expire in <strong>${expiresIn} minutes</strong>.
              </p>
              <p style="color: #999999; font-size: 12px; line-height: 1.5; margin: 0;">
                If you didn't request this code, please ignore this email.
              </p>
            </div>
            <div style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © 2024 Swaadly. All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
