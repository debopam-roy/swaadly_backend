import {
  IsString,
  IsOptional,
  IsDateString,
  MaxLength,
  IsObject,
} from 'class-validator';

export class UpdateUserProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(150)
  displayName?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsObject()
  @IsOptional()
  preferences?: Record<string, any>;
}
