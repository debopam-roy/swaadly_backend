import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestPhoneVerificationDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  phone: string;
}
