import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShipmozoAdapter, ShipmozoWarehouse } from './adapters';
import {
  CarrierSelectorService,
  RateAggregatorService,
} from './services';
import {
  RateRequest,
  ShipmentRequest,
  CarrierType,
} from './types';
import { ShipmentCreationFailedException } from './exceptions';
import { ShipmentStatus } from '@prisma/client';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly carriers;

  constructor(
    private readonly prisma: PrismaService,
    private readonly carrierSelector: CarrierSelectorService,
    private readonly rateAggregator: RateAggregatorService,
    private readonly shipmozoAdapter: ShipmozoAdapter,
    // Add more carriers here as they're implemented:
    // private readonly pushpakAdapter: PushpakAdapter,
    // private readonly delhiveryAdapter: DelhiveryAdapter,
  ) {
    // Register all available carriers
    this.carriers = [
      this.shipmozoAdapter,
      // Add more carriers here when ready:
      // this.pushpakAdapter,
      // this.delhiveryAdapter,
    ];

    this.logger.log(
      `Shipping service initialized with ${this.carriers.length} carrier(s)`,
    );
  }

  /**
   * Get delivery options for checkout page
   * Returns user-friendly options without exposing carrier details
   */
  async getDeliveryOptions(request: RateRequest) {
    try {
      this.logger.log(
        `Getting delivery options for route ${request.pickupPincode} -> ${request.deliveryPincode}`,
      );

      const rates = await this.rateAggregator.aggregateRates(
        this.carriers,
        request,
      );

      if (rates.length === 0) {
        throw new BadRequestException(
          'No delivery options available for this route',
        );
      }

      // Return simplified options for user
      return rates
        .sort((a, b) => a.rate - b.rate)
        .map((rate, index) => ({
          id: `${rate.carrierType}_${rate.carrierId}`,
          name: `${rate.estimatedDeliveryDays} Delivery`,
          deliveryTime: rate.estimatedDeliveryDays,
          price: rate.rate,
          recommended: index === 0, // Mark cheapest as recommended
        }));
    } catch (error) {
      this.logger.error(`Failed to get delivery options: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create shipment with automatic carrier selection
   * This is the main method that orchestrates the entire shipping process
   */
  async createShipment(request: ShipmentRequest) {
    try {
      this.logger.log(`Creating shipment for order ${request.orderId}`);

      // 1. Get all available rates
      const rates = await this.rateAggregator.aggregateRates(
        this.carriers,
        request,
      );

      if (rates.length === 0) {
        throw new BadRequestException(
          'No carriers available for this route',
        );
      }

      // 2. Select best carrier based on business rules
      const selectedRate = this.carrierSelector.selectBestCarrier(rates, {
        pickupPincode: request.pickupPincode,
        deliveryPincode: request.deliveryPincode,
        weight: request.weight,
        orderValue: request.orderAmount,
      });

      this.logger.log(
        `Selected ${selectedRate.carrierName} for order ${request.orderId}`,
      );

      // 3. Find the adapter for selected carrier
      const adapter = this.carriers.find(
        (c) => c.carrierType === selectedRate.carrierType,
      );

      if (!adapter) {
        throw new InternalServerErrorException(
          `Adapter not found for ${selectedRate.carrierType}`,
        );
      }

      // 4. Create shipment with the selected carrier
      const response = await adapter.createShipment(request);

      // 5. Save shipment to database
      const shipment = await this.prisma.shipment.create({
        data: {
          orderId: request.orderId,
          carrierType: selectedRate.carrierType as any,
          carrierName: selectedRate.carrierName,
          trackingNumber: response.trackingNumber,
          currentStatus: ShipmentStatus.PENDING as any,
          estimatedDeliveryDays: selectedRate.estimatedDeliveryDays,
          shippingCost: selectedRate.rate,
          metadata: response.metadata || {},
          labelUrl: response.labelUrl,
          isActive: true,
        },
      });

      this.logger.log(
        `Shipment created successfully for order ${request.orderId} with tracking number ${response.trackingNumber}`,
      );

      return {
        success: true,
        orderId: request.orderId,
        trackingNumber: response.trackingNumber,
        estimatedDelivery: selectedRate.estimatedDeliveryDays,
        shippingCost: selectedRate.rate,
        carrierName: selectedRate.carrierName,
      };
    } catch (error) {
      this.logger.error(
        `Shipment creation failed for order ${request.orderId}: ${error.message}`,
      );

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new ShipmentCreationFailedException(
        'Failed to create shipment',
        error,
      );
    }
  }

  /**
   * Track shipment by order ID
   * Provides unified tracking interface regardless of carrier
   */
  async trackShipment(orderId: string) {
    try {
      this.logger.log(`Tracking shipment for order ${orderId}`);

      // Find shipment in database
      const shipment = await this.prisma.shipment.findUnique({
        where: { orderId },
      });

      if (!shipment) {
        throw new NotFoundException(`Shipment not found for order ${orderId}`);
      }

      // Find the carrier adapter
      const adapter = this.carriers.find(
        (c) => c.carrierType === shipment.carrierType,
      );

      if (!adapter) {
        throw new InternalServerErrorException(
          `Carrier adapter not available for ${shipment.carrierType}`,
        );
      }

      // Get tracking info from carrier
      const tracking = await adapter.trackShipment(shipment.trackingNumber);

      // Update database with latest status
      await this.prisma.shipment.update({
        where: { orderId },
        data: {
          currentStatus: tracking.statusCode as any,
          lastTrackedAt: new Date(),
        },
      });

      // Save tracking events
      if (tracking.events.length > 0) {
        await this.prisma.shipmentTrackingEvent.createMany({
          data: tracking.events.map((event) => ({
            shipmentId: shipment.id,
            status: event.status,
            statusCode: tracking.statusCode as any,
            location: event.location || '',
            remarks: event.remarks || '',
            timestamp: event.timestamp,
          })),
          skipDuplicates: true,
        });
      }

      return {
        orderId: shipment.orderId,
        trackingNumber: shipment.trackingNumber,
        carrierName: shipment.carrierName,
        status: this.getUserFriendlyStatus(tracking.statusCode),
        statusCode: tracking.statusCode,
        expectedDelivery: tracking.expectedDeliveryDate,
        currentLocation: tracking.location,
        lastUpdated: tracking.lastUpdated,
        timeline: tracking.events.map((event) => ({
          status: event.status,
          location: event.location,
          timestamp: event.timestamp,
          remarks: event.remarks,
        })),
      };
    } catch (error) {
      this.logger.error(`Tracking failed for order ${orderId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel shipment by order ID
   */
  async cancelShipment(orderId: string) {
    try {
      this.logger.log(`Cancelling shipment for order ${orderId}`);

      const shipment = await this.prisma.shipment.findUnique({
        where: { orderId },
      });

      if (!shipment) {
        throw new NotFoundException(`Shipment not found for order ${orderId}`);
      }

      // Check if shipment can be cancelled
      if (
        shipment.currentStatus === ShipmentStatus.DELIVERED ||
        shipment.currentStatus === ShipmentStatus.CANCELLED
      ) {
        throw new BadRequestException(
          `Cannot cancel shipment with status ${shipment.currentStatus}`,
        );
      }

      // Find carrier adapter
      const adapter = this.carriers.find(
        (c) => c.carrierType === shipment.carrierType,
      );

      if (!adapter) {
        throw new InternalServerErrorException(
          `Carrier adapter not available for ${shipment.carrierType}`,
        );
      }

      // Cancel with carrier
      const cancelled = await adapter.cancelShipment(shipment.trackingNumber);

      if (cancelled) {
        // Update database
        await this.prisma.shipment.update({
          where: { orderId },
          data: {
            currentStatus: ShipmentStatus.CANCELLED as any,
            isActive: false,
          },
        });

        this.logger.log(`Shipment cancelled successfully for order ${orderId}`);
        return { success: true, message: 'Shipment cancelled successfully' };
      } else {
        throw new InternalServerErrorException('Failed to cancel shipment');
      }
    } catch (error) {
      this.logger.error(
        `Cancellation failed for order ${orderId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Convert status code to user-friendly message
   */
  private getUserFriendlyStatus(statusCode: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'Order Confirmed',
      IN_TRANSIT: 'On the Way',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
      RETURNED: 'Returned',
      FAILED: 'Delivery Failed',
      UNKNOWN: 'Processing',
    };
    return statusMap[statusCode] || 'Processing';
  }

  /**
   * Get shipment details by order ID (for admin/internal use)
   */
  async getShipmentDetails(orderId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
      include: {
        trackingEvents: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment not found for order ${orderId}`);
    }

    return shipment;
  }

  /**
   * Test pincode serviceability (testing/debug method)
   */
  async testServiceability(pickupPincode: string, deliveryPincode: string) {
    this.logger.log(
      `Testing serviceability: ${pickupPincode} -> ${deliveryPincode}`,
    );

    const results = await Promise.all(
      this.carriers.map(async (carrier) => {
        try {
          const serviceable = await carrier.checkServiceability(
            pickupPincode,
            deliveryPincode,
          );
          return {
            carrier: carrier.carrierName,
            carrierType: carrier.carrierType,
            serviceable,
          };
        } catch (error) {
          return {
            carrier: carrier.carrierName,
            carrierType: carrier.carrierType,
            serviceable: false,
            error: error.message,
          };
        }
      }),
    );

    return { pickupPincode, deliveryPincode, results };
  }

  /**
   * Get all warehouses from Shipmozo (testing/debug method)
   */
  async getWarehouses(): Promise<{
    success: boolean;
    count?: number;
    warehouses?: ShipmozoWarehouse[];
    error?: string;
  }> {
    this.logger.log('Fetching warehouses from Shipmozo');

    try {
      const warehouses = await this.shipmozoAdapter.getWarehouses();
      return {
        success: true,
        count: warehouses.length,
        warehouses,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch warehouses: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
