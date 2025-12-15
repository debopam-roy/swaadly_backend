import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { Auth, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { ERROR_MESSAGES } from '../../common/constants';

type AuthWithUser = Auth & { user: User | null };

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<AuthWithUser | null> {
    return this.prisma.auth.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async findByEmail(email: string): Promise<AuthWithUser | null> {
    if (!email) return null;

    return this.prisma.auth.findUnique({
      where: { email },
      include: { user: true },
    });
  }

  async findByPhone(phone: string): Promise<AuthWithUser | null> {
    return this.prisma.auth.findUnique({
      where: { phone },
      include: { user: true },
    });
  }

  async findByGoogleId(googleId: string): Promise<AuthWithUser | null> {
    if (!googleId) return null;

    return this.prisma.auth.findUnique({
      where: { googleId },
      include: { user: true },
    });
  }

  async create(createUserDto: CreateUserDto): Promise<AuthWithUser> {
    const { email, phone, googleId, emailVerified, phoneVerified } =
      createUserDto;

    // Check if email exists
    if (email) {
      const existingEmail = await this.findByEmail(email);
      if (existingEmail) {
        throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
      }
    }

    // Check if phone exists
    if (phone) {
      const existingPhone = await this.findByPhone(phone);
      if (existingPhone) {
        throw new ConflictException(ERROR_MESSAGES.PHONE_ALREADY_EXISTS);
      }
    }

    this.logger.debug(
      `Creating new auth with email: ${email || 'none'}, phone: ${phone || 'none'}`,
    );

    // Create auth record and associated user record in a transaction
    return this.prisma.auth.create({
      data: {
        email,
        phone,
        googleId,
        emailVerified: emailVerified || false,
        phoneVerified: phoneVerified || false,
        user: {
          create: {},
        },
      },
      include: { user: true },
    });
  }

  async update(
    id: string,
    data: Partial<Omit<Auth, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<AuthWithUser> {
    this.logger.debug(`Updating auth: ${id}`);

    return this.prisma.auth.update({
      where: { id },
      data,
      include: { user: true },
    });
  }

  async updateLastLogin(id: string): Promise<Auth> {
    return this.prisma.auth.update({
      where: { id },
      data: { lastLogin: new Date() },
    });
  }

  async updateUserProfile(
    authId: string,
    data: any,
  ): Promise<User> {
    this.logger.debug(`Updating user profile for auth: ${authId}`);

    // Find the user by authId
    const user = await this.prisma.user.findUnique({
      where: { authId },
    });

    if (!user) {
      throw new ConflictException('User profile not found');
    }

    return this.prisma.user.update({
      where: { authId },
      data: {
        ...data,
        updatedAt: new Date(),
      } as any,
    });
  }
}
