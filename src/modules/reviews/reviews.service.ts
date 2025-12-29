import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryReviewsDto, ReviewSortBy } from './dto/query-reviews.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { generateInitialsAvatar } from '../../common/utils/avatar.util';
import {
  CalculateRatingsResponseDto,
  VariantRatingDto,
  RatingDistributionDto,
} from './dto/variant-rating.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryReviewsDto): Promise<{
    reviews: ReviewResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      productId,
      variantId,
      rating,
      isApproved = true,
      sortBy = ReviewSortBy.CREATED_AT,
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    // Build where clause
    const where: any = {
      isApproved,
    };

    if (productId) {
      where.productId = productId;
    }

    if (variantId) {
      where.variantId = variantId;
    }

    if (rating) {
      where.rating = rating;
    }

    // Build orderBy clause
    let orderBy: any = {};
    switch (sortBy) {
      case ReviewSortBy.RATING:
        orderBy = { rating: sortOrder };
        break;
      case ReviewSortBy.HELPFUL_COUNT:
        orderBy = { helpfulCount: sortOrder };
        break;
      case ReviewSortBy.CREATED_AT:
      default:
        orderBy = { createdAt: sortOrder };
        break;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      reviews: reviews.map(this.mapToResponseDto),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<ReviewResponseDto | null> {
    const review = await this.prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      return null;
    }

    return this.mapToResponseDto(review);
  }

  private mapToResponseDto(review: any): ReviewResponseDto {
    // Generate avatar from reviewer name for legacy reviews
    const reviewerAvatarUrl = review.reviewerName
      ? generateInitialsAvatar({ name: review.reviewerName })
      : undefined;

    return {
      id: review.id,
      reviewerName: review.reviewerName,
      reviewerEmail: review.reviewerEmail,
      reviewerAvatarUrl,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      isVerifiedPurchase: review.isVerifiedPurchase,
      isApproved: review.isApproved,
      helpfulCount: review.helpfulCount,
      unhelpfulCount: review.unhelpfulCount,
      productId: review.productId,
      variantId: review.variantId,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }

  /**
   * Calculate and update average ratings for all product variants
   * Combines both legacy reviews and item reviews (verified purchases)
   * Following SOLID principles - Single Responsibility
   */
  async calculateAndUpdateRatings(): Promise<CalculateRatingsResponseDto> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();


    try {
      // Get all product variants
      const variants = await this.prisma.productVariant.findMany({
        select: { id: true },
      });


      const variantRatings: VariantRatingDto[] = [];
      let processedCount = 0;
      let skippedCount = 0;

      // Process each variant sequentially to avoid database connection issues
      for (const variant of variants) {
        processedCount++;

        const variantRating = await this.calculateVariantRating(variant.id);
        if (variantRating) {
          variantRatings.push(variantRating);
        } else {
          skippedCount++;
        }
      }



      return {
        success: true,
        message: 'Ratings calculated and updated successfully',
        updatedVariantsCount: variantRatings.length,
        variantRatings,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculate rating for a single variant
   * DRY principle - reusable method for single variant calculation
   * @param variantId - The variant ID to calculate rating for
   * @returns VariantRatingDto if reviews exist, null otherwise
   */
  private async calculateVariantRating(
    variantId: string,
  ): Promise<VariantRatingDto | null> {
    // Fetch all approved reviews for this variant from both sources
    // Using Promise.all for parallel queries - performance optimization
    const [legacyReviews, itemReviews] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          variantId,
          isApproved: true,
        },
        select: { rating: true },
      }),
      this.prisma.itemReview.findMany({
        where: {
          variantId,
          isApproved: true,
        },
        select: { rating: true },
      }),
    ]);

    // Combine ratings from both sources
    const allRatings = [
      ...legacyReviews.map((r) => r.rating),
      ...itemReviews.map((r) => r.rating),
    ];

    // Skip if no reviews exist for this variant
    if (allRatings.length === 0) {
      // Reset rating fields to defaults
      await this.prisma.productVariant.update({
        where: { id: variantId },
        data: {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
      });
      return null;
    }

    // Calculate average rating (exactly 1 decimal place)
    const sum = allRatings.reduce((acc, rating) => acc + rating, 0);
    const averageRating = sum / allRatings.length;

    // Round to exactly 1 decimal place
    const roundedAverage = Math.round(averageRating * 10) / 10;

    // Calculate rating distribution
    const distribution: RatingDistributionDto = {
      1: allRatings.filter((r) => r === 1).length,
      2: allRatings.filter((r) => r === 2).length,
      3: allRatings.filter((r) => r === 3).length,
      4: allRatings.filter((r) => r === 4).length,
      5: allRatings.filter((r) => r === 5).length,
    };

    // Update the variant with calculated values
    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        averageRating: roundedAverage,
        totalReviews: allRatings.length,
        ratingDistribution: distribution as any,
      },
    });

    return {
      variantId,
      averageRating: roundedAverage,
      totalReviews: allRatings.length,
      ratingDistribution: distribution,
    };
  }
}
