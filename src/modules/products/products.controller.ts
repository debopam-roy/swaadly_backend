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
import { ProductsService } from './products.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('products')
@UseGuards(ThrottlerGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Get all products with pagination and filters
   * Public endpoint - no authentication required
   */
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  /**
   * Get product by ID
   * Public endpoint - no authentication required
   */
  @Public()
  @Get('id/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    const product = await this.productsService.findOne(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  /**
   * Get product by slug
   * Public endpoint - no authentication required
   */
  @Public()
  @Get(':slug')
  @HttpCode(HttpStatus.OK)
  async findBySlug(@Param('slug') slug: string) {
    const product = await this.productsService.findBySlug(slug);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }
}
