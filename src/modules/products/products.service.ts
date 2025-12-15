import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryProductsDto, ProductSortBy } from './dto/query-products.dto';
import { ProductResponseDto } from './dto/product-response.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductsDto): Promise<{
    products: ProductResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      search,
      productType,
      tag,
      isFeatured,
      isActive = true, // Default to active products only
      sortBy = ProductSortBy.DISPLAY_ORDER,
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = query;

    // Build where clause
    const where: any = {
      isActive,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    if (productType) {
      where.productType = productType;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    // Build orderBy clause
    let orderBy: any = {};
    switch (sortBy) {
      case ProductSortBy.NAME:
        orderBy = { name: sortOrder };
        break;
      case ProductSortBy.PRICE:
        // We'll need to sort by the default variant's selling price
        // For now, we'll use display order and handle price sorting later
        orderBy = { displayOrder: sortOrder };
        break;
      case ProductSortBy.RATING:
        orderBy = { averageRating: sortOrder };
        break;
      case ProductSortBy.SALES:
        orderBy = { totalSales: sortOrder };
        break;
      case ProductSortBy.CREATED_AT:
        orderBy = { createdAt: sortOrder };
        break;
      case ProductSortBy.DISPLAY_ORDER:
      default:
        orderBy = { displayOrder: sortOrder };
        break;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          variants: {
            where: { isAvailable: true },
            orderBy: [{ isDefault: 'desc' }, { displayOrder: 'asc' }],
          },
          images: {
            orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      products: products.map(this.mapToResponseDto),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<ProductResponseDto | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        variants: {
          where: { isAvailable: true },
          orderBy: [{ isDefault: 'desc' }, { displayOrder: 'asc' }],
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        },
      },
    });

    if (!product) {
      return null;
    }

    return this.mapToResponseDto(product);
  }

  async findBySlug(slug: string): Promise<ProductResponseDto | null> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        variants: {
          where: { isAvailable: true },
          orderBy: [{ isDefault: 'desc' }, { displayOrder: 'asc' }],
        },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
        },
      },
    });

    if (!product) {
      return null;
    }

    // Increment view count asynchronously
    this.prisma.product
      .update({
        where: { slug },
        data: { viewCount: { increment: 1 } },
      })
      .catch((err) => console.error('Failed to increment view count:', err));

    return this.mapToResponseDto(product);
  }

  private mapToResponseDto(product: any): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      shortDescription: product.shortDescription,
      longDescription: product.longDescription,
      productType: product.productType,
      tags: product.tags,
      proteinPer100g: product.proteinPer100g
        ? parseFloat(product.proteinPer100g)
        : undefined,
      caloriesPer100g: product.caloriesPer100g,
      nutritionalInfo: product.nutritionalInfo,
      features: product.features,
      usageInstructions: product.usageInstructions,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      totalSales: product.totalSales,
      totalReviews: product.totalReviews,
      averageRating: parseFloat(product.averageRating),
      viewCount: product.viewCount,
      displayOrder: product.displayOrder,
      variants: product.variants?.map((variant: any) => ({
        id: variant.id,
        sku: variant.sku,
        weight: variant.weight,
        weightUnit: variant.weightUnit,
        mrp: parseFloat(variant.mrp),
        sellingPrice: parseFloat(variant.sellingPrice),
        discountPercentage: parseFloat(variant.discountPercentage),
        couponCode: variant.couponCode,
        couponAppliedPrice: variant.couponAppliedPrice
          ? parseFloat(variant.couponAppliedPrice)
          : undefined,
        stockQuantity: variant.stockQuantity,
        isAvailable: variant.isAvailable,
        isDefault: variant.isDefault,
      })),
      images: product.images?.map((image: any) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        thumbnailUrl: image.thumbnailUrl,
        altText: image.altText,
        isPrimary: image.isPrimary,
        displayOrder: image.displayOrder,
      })),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
