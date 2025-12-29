import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('newsletter')
@Public() // Make all newsletter endpoints public
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Post('subscribe')
  @HttpCode(HttpStatus.OK)
  async subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.newsletterService.subscribe(dto);
  }

  @Delete('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Query('email') email: string) {
    return this.newsletterService.unsubscribe(email);
  }

  @Get('status')
  async getStatus(@Query('email') email: string) {
    return this.newsletterService.getSubscriptionStatus(email);
  }
}
