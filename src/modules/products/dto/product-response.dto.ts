export class ProductVariantResponseDto {
  id: string;
  sku: string;
  weight: number;
  weightUnit: string;
  mrp: number;
  sellingPrice: number;
  discountPercentage: number;
  couponCode?: string;
  couponAppliedPrice?: number;
  stockQuantity: number;
  isAvailable: boolean;
  isDefault: boolean;
}

export class ProductImageResponseDto {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  altText?: string;
  isPrimary: boolean;
  displayOrder: number;
}

export class ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  brand: string;
  shortDescription?: string;
  longDescription?: string;
  productType?: string;
  tags: string[];
  proteinPer100g?: number;
  caloriesPer100g?: number;
  nutritionalInfo?: any;
  features?: any;
  usageInstructions?: string;
  isActive: boolean;
  isFeatured: boolean;
  totalSales: number;
  totalReviews: number;
  averageRating: number;
  viewCount: number;
  displayOrder: number;
  variants?: ProductVariantResponseDto[];
  images?: ProductImageResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}
