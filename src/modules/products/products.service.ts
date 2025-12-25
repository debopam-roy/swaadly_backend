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
      tag,
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
        { flavor: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    if (tag) {
      where.tags = { has: tag };
    }

    // Build orderBy clause
    let orderBy: any = {};
    switch (sortBy) {
      case ProductSortBy.NAME:
        orderBy = { name: sortOrder };
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
          cartImages: true,
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
        cartImages: true,
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
        cartImages: true,
      },
    });

    if (!product) {
      return null;
    }

    return this.mapToResponseDto(product);
  }

  private mapToResponseDto(product: any): ProductResponseDto {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      flavor: product.flavor,
      brand: product.brand,
      aboutProduct: product.aboutProduct,
      bestWayToEat: product.bestWayToEat,
      bestWayToEatImageUrl: product.bestWayToEatImageUrl,
      tags: product.tags,
      isActive: product.isActive,
      displayOrder: product.displayOrder,
      variants: product.variants?.map((variant: any) => ({
        id: variant.id,
        sku: variant.sku,
        weight: variant.weight,
        weightUnit: variant.weightUnit,
        proteinQuantity: variant.proteinQuantity
          ? parseFloat(variant.proteinQuantity)
          : undefined,
        mrp: parseFloat(variant.mrp),
        sellingPrice: parseFloat(variant.sellingPrice),
        discountPercentage: parseFloat(variant.discountPercentage),
        stockQuantity: variant.stockQuantity,
        isAvailable: variant.isAvailable,
        isDefault: variant.isDefault,
      })),
      images: product.images?.map((image: any) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        deviceType: image.deviceType,
        altText: image.altText,
        isPrimary: image.isPrimary,
        displayOrder: image.displayOrder,
      })),
      cartImages: product.cartImages?.map((image: any) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        deviceType: image.deviceType,
        altText: image.altText,
      })),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
