import {
  Controller,
  Get,
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
}
