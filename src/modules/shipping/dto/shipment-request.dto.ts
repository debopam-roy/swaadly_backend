import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RateRequestDto } from './rate-request.dto';

class CustomerDetailsDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  address1: string;

  @IsOptional()
  @IsString()
  address2?: string;

  @IsString()
  city: string;

  @IsString()
  state: string;
}

class ProductItemDto {
  @IsString()
  name: string;

  @IsString()
  sku: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class ShipmentRequestDto extends RateRequestDto {
  @IsString()
  orderId: string;

  @IsString()
  orderDate: string;

  @ValidateNested()
  @Type(() => CustomerDetailsDto)
  customerDetails: CustomerDetailsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductItemDto)
  products: ProductItemDto[];

  @IsOptional()
  @IsString()
  warehouseId?: string;
}
