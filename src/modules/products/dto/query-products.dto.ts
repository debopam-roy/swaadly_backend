import { IsOptional, IsString, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum ProductSortBy {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  DISPLAY_ORDER = 'displayOrder',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryProductsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(ProductSortBy)
  sortBy?: ProductSortBy = ProductSortBy.DISPLAY_ORDER;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
