import { Injectable, HttpException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { BaseCarrierAdapter } from './base-carrier.adapter';
import {
  CarrierType,
  RateRequest,
  CarrierRate,
  ShipmentRequest,
  ShipmentResponse,
  TrackingStatus,
  TrackingEvent,
} from '../types';

/**
 * Shipmozo API Response Interface
 */
interface ShipmozoResponse<T = any> {
  result: '0' | '1'; // "1" = success, "0" = failure
  message: string;
  data: T;
}

/**
 * Rate Calculator Response Data
 */
interface ShipmozoRateData {
  courier_id: number;
  courier_name: string;
  courier_service: string;
  rate: number;
  estimated_delivery_days: string;
  cod_available: boolean;
  pickups_automatically_scheduled: 'YES' | 'NO';
  minimum_weight: number;
  maximum_weight: number;
}

/**
 * Push Order Response Data
 */
interface ShipmozoPushOrderData {
  Info: string;
  order_id: string;
  reference_id: string;
}

/**
 * Assign Courier Response Data
 */
interface ShipmozoAssignCourierData {
  order_id: string;
  reference_id: string;
  courier: string;
}

/**
 * Schedule Pickup Response Data
 */
interface ShipmozoSchedulePickupData {
  order_id: string;
  reference_id: string;
  courier: string;
  awb_number: string;
  lr_number: string;
}

/**
 * Track Order Response Data
 */
interface ShipmozoTrackData {
  order_id: string;
  reference_id: string;
  awb_number: string;
  courier: string;
  expected_delivery_date: string | null;
  current_status: string;
  status_time: string | null;
  scan_detail: Array<{
    status: string;
    location: string;
    timestamp: string;
    remarks?: string;
  }>;
}

/**
 * Warehouse Data
 */
export interface ShipmozoWarehouse {
  id: number;
  default: 'YES' | 'NO';
  address_title: string;
  name: string;
  email: string;
  phone: string;
  pincode: string;
  city: string;
  state: string;
  status: 'ACTIVE' | 'INACTIVE';
}

@Injectable()
export class ShipmozoAdapter extends BaseCarrierAdapter {
  readonly carrierType = CarrierType.SHIPMOZO;
  readonly carrierName = 'Shipmozo';

  private readonly apiClient: AxiosInstance;
  private readonly publicKey: string;
  private readonly privateKey: string;
  private defaultWarehousePincode: string = '';

  constructor(private configService: ConfigService) {
    super('ShipmozoAdapter');

    // Load configuration
    this.publicKey = this.configService.get<string>('SHIPMOZO_PUBLIC_KEY') || '';
    this.privateKey = this.configService.get<string>('SHIPMOZO_PRIVATE_KEY') || '';
    const apiUrl = this.configService.get<string>('SHIPMOZO_API_URL') || '';

    if (!this.publicKey || !this.privateKey || !apiUrl) {
      this.logger.warn(
        'Shipmozo credentials not configured. Check SHIPMOZO_PUBLIC_KEY, SHIPMOZO_PRIVATE_KEY, and SHIPMOZO_API_URL in .env',
      );
    }

    // Initialize axios client with auth headers
    this.apiClient = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'public-key': this.publicKey,
        'private-key': this.privateKey,
      },
      timeout: 30000, // 30 second timeout
    });

    // Load default warehouse on initialization
    this.loadDefaultWarehouse();

    this.logger.log('Shipmozo adapter initialized');
  }

  /**
   * Load default warehouse pincode
   */
  private async loadDefaultWarehouse(): Promise<void> {
    try {
      const response = await this.apiClient.get<ShipmozoResponse<ShipmozoWarehouse[]>>('/get-warehouses');

      if (response.data.result === '1' && response.data.data.length > 0) {
        const defaultWarehouse = response.data.data.find((w) => w.default === 'YES' && w.status === 'ACTIVE');
        if (defaultWarehouse) {
          this.defaultWarehousePincode = defaultWarehouse.pincode;
          this.logger.log(`Default warehouse pincode loaded: ${this.defaultWarehousePincode}`);
        }
      }
    } catch (error) {
      this.logger.warn('Failed to load default warehouse', error.message);
    }
  }

  /**
   * Check if Shipmozo services this route
   */
  async checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
  ): Promise<boolean> {
    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.apiClient.post<ShipmozoResponse<{ serviceable: boolean }>>('/pincode-serviceability', {
          pickup_pincode: parseInt(pickupPincode),
          delivery_pincode: parseInt(deliveryPincode),
        });
      });

      if (response.data.result === '0') {
        this.logger.warn(`Serviceability check failed: ${response.data.message}`);
        return false;
      }

      return response.data.data.serviceable === true;
    } catch (error) {
      this.logCarrierError('serviceability check', error);
      return false;
    }
  }

  /**
   * Get shipping rates from Shipmozo
   */
  async getRates(request: RateRequest): Promise<CarrierRate[]> {
    try {
      this.validateRequest(request);

      // Use default warehouse pincode if available, otherwise use request pincode
      const pickupPincode = this.defaultWarehousePincode || request.pickupPincode;

      const response = await this.retryWithBackoff(async () => {
        return await this.apiClient.post<ShipmozoResponse<ShipmozoRateData[]>>('/rate-calculator', {
          order_id: '', // Empty for rate calculation
          pickup_pincode: parseInt(pickupPincode),
          delivery_pincode: parseInt(request.deliveryPincode),
          payment_type: request.paymentType,
          shipment_type: 'FORWARD',
          order_amount: request.orderAmount,
          type_of_package: 'SPS', // Standard Package Size
          rov_type: 'ROV_OWNER', // Responsibility of Value
          cod_amount: request.paymentType === 'COD' ? String(request.codAmount || request.orderAmount) : '',
          weight: request.weight, // in grams
          dimensions: [
            {
              no_of_box: '1',
              length: String(request.dimensions?.length || 10),
              width: String(request.dimensions?.width || 10),
              height: String(request.dimensions?.height || 10),
            },
          ],
        });
      });

      if (response.data.result === '0') {
        this.logger.warn(`Rate calculation failed: ${response.data.message}`);
        return [];
      }

      const rates = response.data.data || [];

      // Convert Shipmozo rates to our standard format
      return rates.map((rate) => ({
        carrierId: String(rate.courier_id),
        carrierName: this.carrierName,
        carrierType: this.carrierType,
        serviceType: rate.courier_service || 'Standard',
        rate: parseFloat(String(rate.rate)),
        estimatedDeliveryDays: rate.estimated_delivery_days || '3-5 days',
        codAvailable: rate.cod_available !== false,
        metadata: {
          courierId: rate.courier_id,
          courierName: rate.courier_name,
          courierService: rate.courier_service,
          autoPickup: rate.pickups_automatically_scheduled === 'YES',
          minWeight: rate.minimum_weight,
          maxWeight: rate.maximum_weight,
        },
      }));
    } catch (error) {
      this.logCarrierError('rate calculation', error);
      return [];
    }
  }

  /**
   * Create shipment with Shipmozo
   * This follows the complete workflow: push-order -> assign-courier -> schedule-pickup (if needed)
   */
  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    try {
      this.validateShipmentRequest(request);

      // Step 1: Push Order to Shipmozo
      this.logger.log(`Step 1: Pushing order ${request.orderId} to Shipmozo`);
      const pushResponse = await this.pushOrder(request);

      // Step 2: Get rates to select courier
      this.logger.log(`Step 2: Getting rates for order ${request.orderId}`);
      const rates = await this.getRates(request);

      if (rates.length === 0) {
        throw new HttpException('No courier options available', 400);
      }

      // Select cheapest courier (you can modify selection logic)
      const selectedCourier = rates[0];
      const courierId = parseInt(selectedCourier.carrierId);

      // Step 3: Assign Courier
      this.logger.log(`Step 3: Assigning courier ${courierId} to order ${request.orderId}`);
      const assignResponse = await this.assignCourier(request.orderId, courierId);

      // Step 4: Schedule Pickup (if needed)
      let awbNumber = '';
      const autoPickup = selectedCourier.metadata?.autoPickup === true;

      if (!autoPickup) {
        this.logger.log(`Step 4: Scheduling pickup for order ${request.orderId}`);
        const pickupResponse = await this.schedulePickup(request.orderId);
        awbNumber = pickupResponse.awb_number;
      } else {
        this.logger.log(`Step 4: Pickup is automatic for order ${request.orderId}`);
        // For auto-pickup, AWB might come later - we'll use order_id as tracking for now
        awbNumber = request.orderId;
      }

      this.logger.log(`Shipment created successfully for order ${request.orderId}, AWB: ${awbNumber}`);

      return {
        success: true,
        trackingNumber: awbNumber,
        carrierId: String(courierId),
        carrierName: assignResponse.courier,
        estimatedDelivery: selectedCourier.estimatedDeliveryDays,
        labelUrl: undefined, // Labels can be fetched separately via get-order-label API
        metadata: {
          shipmozoOrderId: pushResponse.order_id,
          shipmozoReferenceId: pushResponse.reference_id,
          courierName: selectedCourier.metadata?.courierName,
          courierService: selectedCourier.metadata?.courierService,
          autoPickup,
        },
      };
    } catch (error) {
      this.logCarrierError('shipment creation', error);
      throw error;
    }
  }

  /**
   * Push order to Shipmozo (Step 1 of shipment creation)
   */
  private async pushOrder(request: ShipmentRequest): Promise<ShipmozoPushOrderData> {
    const response = await this.apiClient.post<ShipmozoResponse<ShipmozoPushOrderData>>('/push-order', {
      order_id: request.orderId,
      order_date: request.orderDate,
      order_type: 'ESSENTIALS',

      // Customer details
      consignee_name: request.customerDetails.name,
      consignee_phone: parseInt(request.customerDetails.phone),
      consignee_alternate_phone: request.customerDetails.phone ? parseInt(request.customerDetails.phone) : undefined,
      consignee_email: request.customerDetails.email || '',
      consignee_address_line_one: request.customerDetails.address1,
      consignee_address_line_two: request.customerDetails.address2 || '',
      consignee_pin_code: parseInt(request.deliveryPincode),
      consignee_city: request.customerDetails.city,
      consignee_state: request.customerDetails.state,

      // Product details
      product_detail: request.products.map((product) => ({
        name: product.name,
        sku_number: product.sku,
        quantity: product.quantity,
        unit_price: product.price,
        discount: '',
        hsn: '',
        product_category: 'Other',
      })),

      // Payment details
      payment_type: request.paymentType,
      cod_amount: request.paymentType === 'COD' ? String(request.codAmount || request.orderAmount) : '',

      // Package details
      weight: request.weight, // in grams
      length: request.dimensions?.length || 10,
      width: request.dimensions?.width || 10,
      height: request.dimensions?.height || 10,

      // Warehouse
      warehouse_id: request.warehouseId || '',

      // GST (optional)
      gst_ewaybill_number: '',
      gstin_number: '',
    });

    if (response.data.result === '0') {
      throw new HttpException(response.data.message, 400);
    }

    return response.data.data;
  }

  /**
   * Assign courier to order (Step 2 of shipment creation)
   */
  private async assignCourier(orderId: string, courierId: number): Promise<ShipmozoAssignCourierData> {
    const response = await this.apiClient.post<ShipmozoResponse<ShipmozoAssignCourierData>>('/assign-courier', {
      order_id: orderId,
      courier_id: courierId,
    });

    if (response.data.result === '0') {
      throw new HttpException(response.data.message, 400);
    }

    return response.data.data;
  }

  /**
   * Schedule pickup (Step 3 of shipment creation, if pickups_automatically_scheduled = NO)
   */
  private async schedulePickup(orderId: string): Promise<ShipmozoSchedulePickupData> {
    const response = await this.apiClient.post<ShipmozoResponse<ShipmozoSchedulePickupData>>('/schedule-pickup', {
      order_id: orderId,
    });

    if (response.data.result === '0') {
      throw new HttpException(response.data.message, 400);
    }

    return response.data.data;
  }

  /**
   * Track shipment with Shipmozo
   */
  async trackShipment(trackingNumber: string): Promise<TrackingStatus> {
    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.apiClient.get<ShipmozoResponse<ShipmozoTrackData>>(
          `/track-order?awb_number=${trackingNumber}`,
        );
      });

      if (response.data.result === '0') {
        throw new HttpException('Tracking information not available', 404);
      }

      const trackingData = response.data.data;
      const scans = trackingData.scan_detail || [];

      // Convert scan details to tracking events
      const events: TrackingEvent[] = scans.map((scan) => ({
        status: scan.status,
        location: scan.location || '',
        timestamp: new Date(scan.timestamp),
        remarks: scan.remarks || '',
      }));

      const currentStatus = trackingData.current_status || 'Unknown';

      return {
        trackingNumber,
        currentStatus,
        statusCode: this.normalizeStatus(currentStatus),
        expectedDeliveryDate: trackingData.expected_delivery_date || undefined,
        location: scans.length > 0 ? scans[scans.length - 1].location : undefined,
        lastUpdated: trackingData.status_time ? new Date(trackingData.status_time) : new Date(),
        events: events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      };
    } catch (error) {
      this.logCarrierError('tracking', error);
      throw error;
    }
  }

  /**
   * Cancel shipment with Shipmozo
   */
  async cancelShipment(trackingNumber: string): Promise<boolean> {
    try {
      // Note: Shipmozo requires both order_id and awb_number
      // Since we only have tracking number, we'll use it for both
      const response = await this.retryWithBackoff(async () => {
        return await this.apiClient.post<ShipmozoResponse<any>>('/cancel-order', {
          order_id: trackingNumber,
          awb_number: parseInt(trackingNumber) || 0,
        });
      });

      return response.data.result === '1';
    } catch (error) {
      this.logCarrierError('cancellation', error);
      return false;
    }
  }

  /**
   * Get shipping label for an order
   */
  async getLabel(awbNumber: string): Promise<string | null> {
    try {
      const response = await this.apiClient.get<
        ShipmozoResponse<Array<{ label: string; created_at: string }>>
      >(`/get-order-label/${awbNumber}`);

      if (response.data.result === '1' && response.data.data.length > 0) {
        return response.data.data[0].label; // Returns base64-encoded PNG
      }

      return null;
    } catch (error) {
      this.logCarrierError('label generation', error);
      return null;
    }
  }

  /**
   * Get list of warehouses
   */
  async getWarehouses(): Promise<ShipmozoWarehouse[]> {
    try {
      const response = await this.apiClient.get<ShipmozoResponse<ShipmozoWarehouse[]>>('/get-warehouses');

      if (response.data.result === '1') {
        return response.data.data.filter((w) => w.status === 'ACTIVE');
      }

      return [];
    } catch (error) {
      this.logCarrierError('warehouse fetch', error);
      return [];
    }
  }
}
