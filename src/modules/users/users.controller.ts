import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ImageUploadService } from '../../common/services/image-upload.service';

/**
 * Users Controller
 *
 * Handles user profile management and onboarding
 */
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly imageUploadService: ImageUploadService,
  ) {}

  /**
   * Get Current User Profile
   * Returns the full user profile including all details
   */
  @Get('me')
  async getCurrentUser(@CurrentUser('sub') userId: string) {
    const auth = await this.usersService.findById(userId);
    if (!auth || !auth.user) {
      throw new Error('User not found');
    }

    return {
      auth: {
        id: auth.id,
        email: auth.email,
        phone: auth.phone,
        emailVerified: auth.emailVerified,
        phoneVerified: auth.phoneVerified,
      },
      profile: auth.user,
    };
  }

  /**
   * Update User Profile
   * Updates user profile information
   */
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateUserProfileDto,
  ) {
    const updateData: any = { ...dto };
    if (dto.dateOfBirth) {
      updateData.dateOfBirth = new Date(dto.dateOfBirth);
    }

    const updatedUser = await this.usersService.updateUserProfile(userId, updateData);
    return {
      message: 'Profile updated successfully',
      profile: updatedUser,
    };
  }

  /**
   * Complete Onboarding
   * Marks onboarding as complete and updates profile
   */
  @Put('onboarding/complete')
  @HttpCode(HttpStatus.OK)
  async completeOnboarding(
    @CurrentUser('sub') userId: string,
    @Body() dto: CompleteOnboardingDto,
  ) {
    const updateData: any = { ...dto };
    if (dto.dateOfBirth) {
      updateData.dateOfBirth = new Date(dto.dateOfBirth);
    }
    updateData.onboardingCompleted = true;
    updateData.profileCompletedAt = new Date();

    const updatedUser = await this.usersService.updateUserProfile(userId, updateData);

    return {
      message: 'Onboarding completed successfully',
      profile: updatedUser,
    };
  }

  /**
   * Upload Profile Photo
   * Uploads and processes user profile photo
   */
  @Post('profile/photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('photo'))
  async uploadProfilePhoto(
    @CurrentUser('sub') authId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No photo file provided');
    }

    try {
      // Upload photo to GCS
      const { imageUrl } = await this.imageUploadService.uploadProfilePicture(
        file,
        authId,
      );

      // Update user profile with new avatar URL
      const updatedUser = await this.usersService.updateUserProfile(authId, {
        avatarUrl: imageUrl,
      });

      return {
        message: 'Profile photo uploaded successfully',
        avatarUrl: imageUrl,
        profile: updatedUser,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload photo: ${error.message}`,
      );
    }
  }
}
