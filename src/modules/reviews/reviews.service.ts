import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryReviewsDto, ReviewSortBy } from './dto/query-reviews.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { generateInitialsAvatar } from '../../common/utils/avatar.util';

@Injectable()
export class ReviewsService {
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
}
