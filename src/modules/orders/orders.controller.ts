import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Orders Controller
 *
 * Handles order management for authenticated users
 * All endpoints require authentication
 */
@Controller('orders')
@UseGuards(ThrottlerGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Get all orders for the current user
   * Supports pagination, filtering by status, and search
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query() query: QueryOrdersDto,
  ) {
    return this.ordersService.findAllByUser(userId, query);
  }

  /**
   * Get a specific order by ID
   */
  @Get('id/:id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.findOneByUser(userId, orderId);
  }

  /**
   * Get a specific order by order number
   */
  @Get('number/:orderNumber')
  @HttpCode(HttpStatus.OK)
  async findByOrderNumber(
    @CurrentUser('sub') userId: string,
    @Param('orderNumber') orderNumber: string,
  ) {
    return this.ordersService.findOneByOrderNumber(userId, orderNumber);
  }

  /**
   * Get order tracking information
   * Returns only tracking-related fields (status, tracking number, courier, etc.)
   */
  @Get(':id/tracking')
  @HttpCode(HttpStatus.OK)
  async getTracking(
    @CurrentUser('sub') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.getOrderTracking(userId, orderId);
  }
}
