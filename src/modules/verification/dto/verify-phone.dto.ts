import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyPhoneDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  phone: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}
