import { Logger } from '@nestjs/common';
import {
  CarrierType,
  RateRequest,
  CarrierRate,
  ShipmentRequest,
  ShipmentResponse,
  TrackingStatus,
} from '../types';

export abstract class BaseCarrierAdapter {
  protected readonly logger: Logger;

  abstract readonly carrierType: CarrierType;
  abstract readonly carrierName: string;

  constructor(loggerContext: string) {
    this.logger = new Logger(loggerContext);
  }

  /**
   * Check if carrier services this route
   */
  abstract checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
  ): Promise<boolean>;

  /**
   * Get shipping rates for given request
   */
  abstract getRates(request: RateRequest): Promise<CarrierRate[]>;

  /**
   * Create shipment with carrier
   */
  abstract createShipment(
    request: ShipmentRequest,
  ): Promise<ShipmentResponse>;

  /**
   * Track shipment status
   */
  abstract trackShipment(trackingNumber: string): Promise<TrackingStatus>;

  /**
   * Cancel shipment
   */
  abstract cancelShipment(trackingNumber: string): Promise<boolean>;

  /**
   * Normalize carrier-specific status to standard codes
   */
  protected normalizeStatus(carrierStatus: string): string {
    const statusMap: Record<string, string> = {
      // Pending
      pending: 'PENDING',
      pickup_pending: 'PENDING',
      order_placed: 'PENDING',
      awaiting_pickup: 'PENDING',

      // In transit
      in_transit: 'IN_TRANSIT',
      shipped: 'IN_TRANSIT',
      picked_up: 'IN_TRANSIT',
      dispatched: 'IN_TRANSIT',
      in_hub: 'IN_TRANSIT',

      // Out for delivery
      out_for_delivery: 'OUT_FOR_DELIVERY',
      out_of_delivery: 'OUT_FOR_DELIVERY',

      // Delivered
      delivered: 'DELIVERED',
      completed: 'DELIVERED',

      // Failed/Cancelled
      cancelled: 'CANCELLED',
      rto: 'RETURNED',
      returned: 'RETURNED',
      failed: 'FAILED',
      undelivered: 'FAILED',
    };

    const normalized = carrierStatus.toLowerCase().replace(/\s+/g, '_');
    return statusMap[normalized] || 'UNKNOWN';
  }

  /**
   * Common error handling with retry logic
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;

        const delay = baseDelay * Math.pow(2, i);
        this.logger.warn(
          `Retry ${i + 1}/${maxRetries} after ${delay}ms: ${error.message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Validate common request parameters
   */
  protected validateRequest(request: RateRequest): void {
    if (!/^\d{6}$/.test(request.pickupPincode)) {
      throw new Error('Invalid pickup pincode - must be 6 digits');
    }

    if (!/^\d{6}$/.test(request.deliveryPincode)) {
      throw new Error('Invalid delivery pincode - must be 6 digits');
    }

    if (request.weight <= 0 || request.weight > 50000) {
      throw new Error('Weight must be between 1-50000 grams');
    }

    if (request.orderAmount <= 0) {
      throw new Error('Order amount must be positive');
    }

    if (request.paymentType === 'COD' && !request.codAmount) {
      throw new Error('COD amount is required for COD orders');
    }
  }

  /**
   * Validate shipment request
   */
  protected validateShipmentRequest(request: ShipmentRequest): void {
    this.validateRequest(request);

    if (!request.orderId) {
      throw new Error('Order ID is required');
    }

    if (!request.customerDetails?.name) {
      throw new Error('Customer name is required');
    }

    if (!request.customerDetails?.phone) {
      throw new Error('Customer phone is required');
    }

    if (!request.customerDetails?.address1) {
      throw new Error('Customer address is required');
    }

    if (!request.customerDetails?.city) {
      throw new Error('Customer city is required');
    }

    if (!request.customerDetails?.state) {
      throw new Error('Customer state is required');
    }

    if (!request.products || request.products.length === 0) {
      throw new Error('At least one product is required');
    }
  }

  /**
   * Log carrier API errors with details
   */
  protected logCarrierError(operation: string, error: any): void {
    this.logger.error(`${this.carrierName} ${operation} failed:`, {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
  }
}
