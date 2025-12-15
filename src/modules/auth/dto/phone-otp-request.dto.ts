import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class PhoneOtpRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone must be in E.164 format (e.g., +919876543210)',
  })
  phone: string;
}
