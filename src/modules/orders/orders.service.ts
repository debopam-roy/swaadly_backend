import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryOrdersDto } from './dto/query-orders.dto';
import {
  OrderResponseDto,
  OrderSummaryResponseDto,
  OrderItemResponseDto,
} from './dto/order-response.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all orders for a user with pagination and filters
   */
  async findAllByUser(
    userId: string,
    query: QueryOrdersDto,
  ): Promise<{
    orders: OrderSummaryResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    // Build where clause
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = { [sortBy]: sortOrder };

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          items: {
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      orders: orders.map(this.mapToSummaryDto),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get a single order by ID for a user
   */
  async findOneByUser(userId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapToResponseDto(order);
  }

  /**
   * Get order by order number for a user
   */
  async findOneByOrderNumber(
    userId: string,
    orderNumber: string,
  ): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: {
        orderNumber,
        userId,
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.mapToResponseDto(order);
  }

  /**
   * Get order tracking information
   */
  async getOrderTracking(userId: string, orderId: string): Promise<{
    orderNumber: string;
    status: OrderStatus;
    trackingNumber?: string;
    courierName?: string;
    externalOrderId?: string;
    estimatedDelivery?: Date;
    confirmedAt?: Date;
    shippedAt?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;
  }> {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      select: {
        orderNumber: true,
        status: true,
        trackingNumber: true,
        courierName: true,
        externalOrderId: true,
        estimatedDelivery: true,
        confirmedAt: true,
        shippedAt: true,
        deliveredAt: true,
        cancelledAt: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber || undefined,
      courierName: order.courierName || undefined,
      externalOrderId: order.externalOrderId || undefined,
      estimatedDelivery: order.estimatedDelivery || undefined,
      confirmedAt: order.confirmedAt || undefined,
      shippedAt: order.shippedAt || undefined,
      deliveredAt: order.deliveredAt || undefined,
      cancelledAt: order.cancelledAt || undefined,
    };
  }

  /**
   * Map order to summary DTO
   */
  private mapToSummaryDto(order: any): OrderSummaryResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: parseFloat(order.totalAmount),
      itemCount: order.items?.length || 0,
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery,
    };
  }

  /**
   * Map order to full response DTO
   */
  private mapToResponseDto(order: any): OrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,

      // Pricing
      subtotal: parseFloat(order.subtotal),
      discountAmount: parseFloat(order.discountAmount),
      couponDiscount: parseFloat(order.couponDiscount),
      couponCode: order.couponCode,
      taxAmount: parseFloat(order.taxAmount),
      deliveryFee: parseFloat(order.deliveryFee),
      totalAmount: parseFloat(order.totalAmount),

      // Delivery
      deliveryType: order.deliveryType,
      shippingAddress: {
        line1: order.shippingAddressLine1,
        line2: order.shippingAddressLine2,
        city: order.shippingCity,
        state: order.shippingState,
        postalCode: order.shippingPostalCode,
        country: order.shippingCountry,
      },

      // Customer
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,

      // Tracking
      externalOrderId: order.externalOrderId,
      trackingNumber: order.trackingNumber,
      courierName: order.courierName,
      estimatedDelivery: order.estimatedDelivery,

      // Timestamps
      createdAt: order.createdAt,
      confirmedAt: order.confirmedAt,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      cancelledAt: order.cancelledAt,

      // Cancellation
      cancellationReason: order.cancellationReason,
      cancelledBy: order.cancelledBy,

      // Items
      items: order.items?.map(this.mapToItemDto) || [],

      // Notes
      orderNotes: order.orderNotes,
      deliveryNotes: order.deliveryNotes,
    };
  }

  /**
   * Map order item to DTO
   */
  private mapToItemDto(item: any): OrderItemResponseDto {
    return {
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      productImageUrl: item.productImageUrl,
      variantId: item.variantId,
      variantSku: item.variantSku,
      variantWeight: item.variantWeight,
      variantWeightUnit: item.variantWeightUnit,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice),
      unitMrp: parseFloat(item.unitMrp),
      discountPerUnit: parseFloat(item.discountPerUnit),
      totalPrice: parseFloat(item.totalPrice),
    };
  }
}
