export class RatingDistributionDto {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export class ProductVariantResponseDto {
  id: string;
  sku: string;
  weight: number;
  weightUnit: string;
  proteinQuantity?: number;
  mrp: number;
  sellingPrice: number;
  discountPercentage: number;
  stockQuantity: number;
  isAvailable: boolean;
  isDefault: boolean;
  // Rating fields
  averageRating: number;
  totalReviews: number;
  ratingDistribution: RatingDistributionDto;
}

export class ProductImageResponseDto {
  id: string;
  imageUrl: string;
  deviceType: 'DESKTOP' | 'MOBILE';
  altText?: string;
  isPrimary: boolean;
  displayOrder: number;
}

export class ProductCartImageResponseDto {
  id: string;
  imageUrl: string;
  deviceType: 'DESKTOP' | 'MOBILE';
  altText?: string;
}

export class ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  flavor?: string;
  brand: string;
  aboutProduct?: string;
  bestWayToEat?: string;
  bestWayToEatImageUrl?: string;
  tags: string[];
  isActive: boolean;
  displayOrder: number;
  averageRating?: number;
  totalReviews?: number;
  variants?: ProductVariantResponseDto[];
  images?: ProductImageResponseDto[];
  cartImages?: ProductCartImageResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
