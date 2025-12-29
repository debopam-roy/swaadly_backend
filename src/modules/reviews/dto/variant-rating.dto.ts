export class RatingDistributionDto {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export class VariantRatingDto {
  variantId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: RatingDistributionDto;
}

export class CalculateRatingsResponseDto {
  success: boolean;
  message: string;
  updatedVariantsCount: number;
  variantRatings: VariantRatingDto[];
}
