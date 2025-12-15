import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyPhoneOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phone: string;

  @IsString()
  @Length(6, 6)
  @IsNotEmpty()
  otp: string;
}
