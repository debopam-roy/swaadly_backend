import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { RateRequestDto, ShipmentRequestDto } from './dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  /**
   * POST /shipping/rates
   * Get available shipping rates for checkout
   */
  @Public()
  @Post('rates')
  @HttpCode(HttpStatus.OK)
  async getRates(@Body() request: RateRequestDto) {
    return this.shippingService.getDeliveryOptions(request);
  }

  /**
   * POST /shipping/shipments
   * Create a new shipment (automatically selects best carrier)
   */
  @Post('shipments')
  @HttpCode(HttpStatus.CREATED)
  async createShipment(@Body() request: ShipmentRequestDto) {
    return this.shippingService.createShipment(request);
  }

  /**
   * GET /shipping/track/:orderId
   * Track shipment by order ID
   */
  @Get('track/:orderId')
  @HttpCode(HttpStatus.OK)
  async trackShipment(@Param('orderId') orderId: string) {
    return this.shippingService.trackShipment(orderId);
  }

  /**
   * POST /shipping/cancel/:orderId
   * Cancel a shipment
   */
  @Post('cancel/:orderId')
  @HttpCode(HttpStatus.OK)
  async cancelShipment(@Param('orderId') orderId: string) {
    return this.shippingService.cancelShipment(orderId);
  }

  /**
   * GET /shipping/details/:orderId
   * Get shipment details (internal/admin use)
   */
  @Get('details/:orderId')
  @HttpCode(HttpStatus.OK)
  async getShipmentDetails(@Param('orderId') orderId: string) {
    return this.shippingService.getShipmentDetails(orderId);
  }

  /**
   * GET /shipping/test/serviceability/:pickup/:delivery
   * Test pincode serviceability (testing/debug endpoint)
   */
  @Public()
  @Get('test/serviceability/:pickup/:delivery')
  @HttpCode(HttpStatus.OK)
  async testServiceability(
    @Param('pickup') pickup: string,
    @Param('delivery') delivery: string,
  ) {
    return this.shippingService.testServiceability(pickup, delivery);
  }

  /**
   * GET /shipping/test/warehouses
   * Get all warehouses (testing/debug endpoint)
   */
  @Public()
  @Get('test/warehouses')
  @HttpCode(HttpStatus.OK)
  async testWarehouses() {
    return this.shippingService.getWarehouses();
  }
}
