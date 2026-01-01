import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Addresses Controller
 *
 * Handles user address management endpoints
 * All routes require authentication
 */
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  /**
   * Get all addresses for current user
   */
  @Get()
  async findAll(@CurrentUser('sub') userId: string) {
    const addresses = await this.addressesService.findAllByUser(userId);
    return { addresses };
  }

  /**
   * Get a specific address by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const address = await this.addressesService.findOne(id, userId);
    return { address };
  }

  /**
   * Get user's default address
   */
  @Get('default/address')
  async getDefaultAddress(@CurrentUser('sub') userId: string) {
    const address = await this.addressesService.findDefaultAddress(userId);
    return { address };
  }

  /**
   * Create a new address
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('sub') userId: string,
    @Body() createAddressDto: CreateAddressDto,
  ) {
    const address = await this.addressesService.create(userId, createAddressDto);
    return {
      message: 'Address created successfully',
      address,
    };
  }

  /**
   * Update an existing address
   */
  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    const address = await this.addressesService.update(
      id,
      userId,
      updateAddressDto,
    );
    return {
      message: 'Address updated successfully',
      address,
    };
  }

  /**
   * Set an address as default
   */
  @Put(':id/set-default')
  @HttpCode(HttpStatus.OK)
  async setAsDefault(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const address = await this.addressesService.setAsDefault(id, userId);
    return {
      message: 'Default address updated successfully',
      address,
    };
  }

  /**
   * Delete an address
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.addressesService.remove(id, userId);
  }
}
