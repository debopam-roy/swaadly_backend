export class ReviewResponseDto {
  id: string;
  reviewerName: string;
  reviewerEmail?: string;
  rating: number;
  title?: string;
  comment: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  helpfulCount: number;
  unhelpfulCount: number;
  productId: string;
  variantId?: string;
  createdAt: Date;
  updatedAt: Date;
}
