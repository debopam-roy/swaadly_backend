import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Resend } from 'resend';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private readonly resend: Resend;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  async subscribe(dto: SubscribeNewsletterDto) {
    const { email, source } = dto;

    try {
      // Check if email already exists
      const existingSubscriber =
        await this.prisma.newsletterSubscriber.findUnique({
          where: { email },
        });

      if (existingSubscriber) {
        // If exists and already subscribed
        if (existingSubscriber.isSubscribed && existingSubscriber.isActive) {
          throw new ConflictException(
            'This email is already subscribed to our newsletter',
          );
        }

        // If exists but was unsubscribed, re-subscribe
        const resubscribed = await this.prisma.newsletterSubscriber.update({
          where: { email },
          data: {
            isSubscribed: true,
            isActive: true,
            subscribedAt: new Date(),
            unsubscribedAt: null,
            source: source || existingSubscriber.source,
          },
        });

        // Send welcome back email
        await this.sendWelcomeEmail(email);

        this.logger.log(`User re-subscribed to newsletter: ${email}`);
        return {
          message: 'Successfully re-subscribed to our newsletter!',
          subscriber: {
            email: resubscribed.email,
            subscribedAt: resubscribed.subscribedAt,
          },
        };
      }

      // Create new subscriber
      const subscriber = await this.prisma.newsletterSubscriber.create({
        data: {
          email,
          source: source || 'footer',
          isSubscribed: true,
          isActive: true,
        },
      });

      // Send welcome email
      await this.sendWelcomeEmail(email);

      this.logger.log(`New newsletter subscription: ${email}`);
      return {
        message: 'Successfully subscribed to our newsletter!',
        subscriber: {
          email: subscriber.email,
          subscribedAt: subscriber.subscribedAt,
        },
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Failed to subscribe ${email}:`, error);
      throw error;
    }
  }

  async unsubscribe(email: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      throw new NotFoundException('Email not found in our newsletter list');
    }

    if (!subscriber.isSubscribed) {
      return {
        message: 'You are already unsubscribed from our newsletter',
      };
    }

    await this.prisma.newsletterSubscriber.update({
      where: { email },
      data: {
        isSubscribed: false,
        unsubscribedAt: new Date(),
      },
    });

    this.logger.log(`User unsubscribed from newsletter: ${email}`);
    return {
      message: 'Successfully unsubscribed from our newsletter',
    };
  }

  async getSubscriptionStatus(email: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({
      where: { email },
    });

    if (!subscriber) {
      return {
        subscribed: false,
        message: 'Email not found in our newsletter list',
      };
    }

    return {
      subscribed: subscriber.isSubscribed && subscriber.isActive,
      subscribedAt: subscriber.subscribedAt,
      unsubscribedAt: subscriber.unsubscribedAt,
    };
  }

  private async sendWelcomeEmail(email: string): Promise<void> {
    try {
      const fromEmail =
        this.configService.get<string>('RESEND_FROM_EMAIL') ||
        'noreply@swaadly.com';

      await this.resend.emails.send({
        from: fromEmail,
        to: email,
        subject: 'Welcome to Swaadly Newsletter!',
        html: this.getWelcomeEmailTemplate(email),
      });

      this.logger.debug(`Welcome email sent to: ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}:`, error);
      // Don't throw error - subscription should still succeed even if email fails
    }
  }

  private getWelcomeEmailTemplate(email: string): string {
    const unsubscribeUrl = `${this.configService.get<string>('FRONTEND_URL') || 'https://swaadly.com'}/unsubscribe?email=${encodeURIComponent(email)}`;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background-color: #4F46E5; padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px;">Welcome to Swaadly!</h1>
              <p style="color: #E0E7FF; margin: 0; font-size: 16px;">Thank you for subscribing to our newsletter</p>
            </div>
            <div style="padding: 40px 30px;">
              <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 22px;">🎉 You're In!</h2>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We're thrilled to have you join the Swaadly family! You'll now receive:
              </p>
              <ul style="color: #666666; font-size: 16px; line-height: 1.8; margin: 0 0 30px 20px; padding: 0;">
                <li>Exclusive product launches and updates</li>
                <li>Special offers and discounts just for subscribers</li>
                <li>Delicious recipes and cooking tips</li>
                <li>Behind-the-scenes content from Swaadly</li>
              </ul>
              <div style="background-color: #F0FDF4; border-left: 4px solid #10B981; padding: 20px; margin: 0 0 30px 0; border-radius: 4px;">
                <p style="color: #065F46; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>💡 Pro tip:</strong> Add our email to your contacts to ensure you never miss our delicious updates!
                </p>
              </div>
              <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Stay tuned for amazing content coming your way soon!
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${this.configService.get<string>('FRONTEND_URL') || 'https://swaadly.com'}" style="display: inline-block; background-color: #4F46E5; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                  Visit Swaadly
                </a>
              </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #666666; font-size: 14px; margin: 0 0 15px 0;">
                Follow us on social media for daily updates!
              </p>
              <p style="color: #999999; font-size: 12px; line-height: 1.6; margin: 0 0 15px 0;">
                © ${new Date().getFullYear()} Swaadly. All rights reserved.<br>
                You're receiving this email because you subscribed to our newsletter.
              </p>
              <a href="${unsubscribeUrl}" style="color: #999999; font-size: 12px; text-decoration: underline;">
                Unsubscribe from this list
              </a>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}
