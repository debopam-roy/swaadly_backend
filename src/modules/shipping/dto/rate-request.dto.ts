import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsObject,
  ValidateNested,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

class DimensionsDto {
  @IsNumber()
  @Min(1)
  @Max(200)
  length: number;

  @IsNumber()
  @Min(1)
  @Max(200)
  width: number;

  @IsNumber()
  @Min(1)
  @Max(200)
  height: number;
}

export class RateRequestDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Pickup pincode must be 6 digits' })
  pickupPincode: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Delivery pincode must be 6 digits' })
  deliveryPincode: string;

  @IsNumber()
  @Min(1)
  @Max(50000)
  weight: number; // in grams

  @IsOptional()
  @ValidateNested()
  @Type(() => DimensionsDto)
  dimensions?: DimensionsDto;

  @IsEnum(['PREPAID', 'COD'])
  paymentType: 'PREPAID' | 'COD';

  @IsNumber()
  @Min(1)
  orderAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  codAmount?: number;
}
