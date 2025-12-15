import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  Matches,
} from 'class-validator';

export class VerifyEmailOtpDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Length(6, 6)
  @IsNotEmpty()
  emailOtp: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phone?: string;

  @IsString()
  @Length(6, 6)
  @IsOptional()
  phoneOtp?: string;
}
