import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SubscribeNewsletterDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  source?: string; // e.g., "footer", "checkout", "popup"
}
