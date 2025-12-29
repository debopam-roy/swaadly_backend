import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ReviewsService } from './reviews.service';
import { QueryReviewsDto } from './dto/query-reviews.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CalculateRatingsResponseDto } from './dto/variant-rating.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@Controller('reviews')
@UseGuards(ThrottlerGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Get all reviews with pagination and filters
   * Public endpoint - no authentication required
   */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryReviewsDto) {
    return this.reviewsService.findAll(query);
  }

  /**
   * Get review by ID
   * Public endpoint - no authentication required
   */
  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    const review = await this.reviewsService.findOne(id);
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }

  /**
   * Calculate and update average ratings for all product variants
   * Protected endpoint - requires API key authentication
   * Designed to be called by a cron job every 10-30 minutes
   *
   * Authentication:
   * - Header: x-api-key: YOUR_INTERNAL_API_KEY
   *
   * Combines reviews from:
   * - Legacy reviews (pre-order system)
   * - Item reviews (order-linked, verified purchases)
   *
   * Updates ProductVariant table with:
   * - averageRating (0.00 to 5.00)
   * - totalReviews (count of approved reviews)
   * - ratingDistribution (breakdown by star rating)
   */
  @Public() // Bypass JWT auth
  @UseGuards(ApiKeyGuard) // Use API key auth instead
  @Post('calculate-ratings')
  @HttpCode(HttpStatus.OK)
  async calculateRatings(): Promise<CalculateRatingsResponseDto> {
    return this.reviewsService.calculateAndUpdateRatings();
  }
}
