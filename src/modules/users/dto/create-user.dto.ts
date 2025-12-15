import {
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone must be in E.164 format (e.g., +919876543210)',
  })
  phone?: string;

  @IsString()
  @IsOptional()
  googleId?: string;

  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;

  @IsBoolean()
  @IsOptional()
  phoneVerified?: boolean;
}
