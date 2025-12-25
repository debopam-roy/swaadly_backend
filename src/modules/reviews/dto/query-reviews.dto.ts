import { IsOptional, IsInt, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum ReviewSortBy {
  CREATED_AT = 'createdAt',
  RATING = 'rating',
  HELPFUL_COUNT = 'helpfulCount',
}

export class QueryReviewsDto {
  @IsOptional()
  productId?: string;

  @IsOptional()
  variantId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @IsEnum(ReviewSortBy)
  sortBy?: ReviewSortBy = ReviewSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
