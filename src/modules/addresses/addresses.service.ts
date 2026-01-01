import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address } from '@prisma/client';

/**
 * Addresses Service
 *
 * Handles CRUD operations for user addresses
 * Supports multiple addresses per user with default address management
 */
@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get user ID from auth ID
   * @param authId - The auth ID from JWT token
   * @returns The user ID
   */
  private async getUserIdFromAuthId(authId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { authId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return user.id;
  }

  /**
   * Get all addresses for a user
   */
  async findAllByUser(authId: string): Promise<Address[]> {
    const userId = await this.getUserIdFromAuthId(authId);
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Get a single address by ID
   */
  async findOne(id: string, authId: string): Promise<Address> {
    const userId = await this.getUserIdFromAuthId(authId);
    const address = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // Ensure user owns this address
    if (address.userId !== userId) {
      throw new ForbiddenException('Access denied to this address');
    }

    return address;
  }

  /**
   * Get user's default address
   */
  async findDefaultAddress(authId: string): Promise<Address | null> {
    const userId = await this.getUserIdFromAuthId(authId);
    return this.prisma.address.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });
  }

  /**
   * Create a new address
   */
  async create(
    authId: string,
    createAddressDto: CreateAddressDto,
  ): Promise<Address> {
    const userId = await this.getUserIdFromAuthId(authId);

    // Check if user has any addresses
    const existingAddresses = await this.prisma.address.count({
      where: { userId },
    });

    // If this is the user's first address, make it default
    const isFirstAddress = existingAddresses === 0;

    return this.prisma.address.create({
      data: {
        ...createAddressDto,
        userId,
        isDefault: isFirstAddress,
      },
    });
  }

  /**
   * Update an existing address
   */
  async update(
    id: string,
    authId: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<Address> {
    // Verify ownership
    await this.findOne(id, authId);

    return this.prisma.address.update({
      where: { id },
      data: updateAddressDto,
    });
  }

  /**
   * Set an address as default
   * Unsets any other default address for the user
   */
  async setAsDefault(id: string, authId: string): Promise<Address> {
    const userId = await this.getUserIdFromAuthId(authId);
    // Verify ownership
    const address = await this.findOne(id, authId);

    // Use a transaction to ensure atomicity
    return this.prisma.$transaction(async (tx) => {
      // Unset all other default addresses for this user
      await tx.address.updateMany({
        where: {
          userId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });

      // Set this address as default
      return tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    });
  }

  /**
   * Delete an address
   */
  async remove(id: string, authId: string): Promise<{ message: string }> {
    const userId = await this.getUserIdFromAuthId(authId);
    // Verify ownership
    const address = await this.findOne(id, authId);

    // Check if this is the default address
    if (address.isDefault) {
      // Count total addresses for user
      const totalAddresses = await this.prisma.address.count({
        where: { userId },
      });

      // If user has more than one address, prevent deletion of default
      // They must set another address as default first
      if (totalAddresses > 1) {
        throw new BadRequestException(
          'Cannot delete default address. Please set another address as default first.',
        );
      }
    }

    await this.prisma.address.delete({
      where: { id },
    });

    return { message: 'Address deleted successfully' };
  }
}
