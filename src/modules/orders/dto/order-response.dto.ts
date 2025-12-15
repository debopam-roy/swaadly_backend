import { OrderStatus, DeliveryType } from '@prisma/client';

export class OrderItemResponseDto {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImageUrl?: string;
  variantId: string;
  variantSku: string;
  variantWeight: number;
  variantWeightUnit: string;
  quantity: number;
  unitPrice: number;
  unitMrp: number;
  discountPerUnit: number;
  totalPrice: number;
}

export class OrderResponseDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;

  // Pricing
  subtotal: number;
  discountAmount: number;
  couponDiscount: number;
  couponCode?: string;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;

  // Delivery
  deliveryType: DeliveryType;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  // Customer
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  // Tracking
  externalOrderId?: string;
  trackingNumber?: string;
  courierName?: string;
  estimatedDelivery?: Date;

  // Timestamps
  createdAt: Date;
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;

  // Cancellation
  cancellationReason?: string;
  cancelledBy?: string;

  // Items
  items: OrderItemResponseDto[];

  // Notes
  orderNotes?: string;
  deliveryNotes?: string;
}

export class OrderSummaryResponseDto {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  itemCount: number;
  createdAt: Date;
  estimatedDelivery?: Date;
}
