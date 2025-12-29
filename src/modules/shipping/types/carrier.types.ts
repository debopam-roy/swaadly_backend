export enum CarrierType {
  SHIPMOZO = 'shipmozo',
  DELHIVERY = 'delhivery',
  DTDC = 'dtdc',
  PUSHPAK = 'pushpak',
}

export interface RateRequest {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number; // in grams
  dimensions?: {
    length: number; // in cm
    width: number; // in cm
    height: number; // in cm
  };
  paymentType: 'PREPAID' | 'COD';
  orderAmount: number;
  codAmount?: number;
}

export interface CarrierRate {
  carrierId: string;
  carrierName: string;
  carrierType: CarrierType;
  serviceType: string;
  rate: number;
  estimatedDeliveryDays: string;
  codAvailable: boolean;
  metadata?: Record<string, any>;
}

export interface ShipmentRequest extends RateRequest {
  orderId: string;
  orderDate: string;
  customerDetails: {
    name: string;
    phone: string;
    email?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
  };
  products: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
  }>;
  warehouseId?: string;
}

export interface ShipmentResponse {
  success: boolean;
  trackingNumber: string;
  carrierId: string;
  carrierName: string;
  estimatedDelivery?: string;
  labelUrl?: string;
  metadata?: Record<string, any>;
}

export interface TrackingEvent {
  status: string;
  location: string;
  timestamp: Date;
  remarks?: string;
}

export interface TrackingStatus {
  trackingNumber: string;
  currentStatus: string;
  statusCode: string;
  expectedDeliveryDate?: string;
  location?: string;
  lastUpdated: Date;
  events: TrackingEvent[];
}

export interface SelectionCriteria {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number;
  orderValue: number;
}

export interface CarrierPreference {
  pincodePrefixes: string[];
  states?: string[];
  preferredCarrier: CarrierType;
  priority: number;
}
