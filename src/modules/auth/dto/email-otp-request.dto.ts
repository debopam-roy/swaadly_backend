import { IsEmail, IsNotEmpty } from 'class-validator';

export class EmailOtpRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
