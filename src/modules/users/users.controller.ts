import {
  Controller,
  Get,
  Put,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Users Controller
 *
 * Handles user profile management and onboarding
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
}
