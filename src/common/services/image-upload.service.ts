import { Injectable, Logger } from '@nestjs/common';
import { bucket, bucketName } from '../../config/storage.config';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface ImageUploadResult {
  imageUrl: string;
  thumbnailUrl: string;
}

export interface ImageProcessingOptions {
  width: number;
  height: number;
  quality: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);

  /**
   * Upload and process a single image with thumbnail
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
    mainImageOptions: ImageProcessingOptions = {
      width: 1200,
      height: 1200,
      quality: 85,
      fit: 'inside',
    },
    thumbnailOptions: ImageProcessingOptions = {
      width: 300,
      height: 300,
      quality: 80,
      fit: 'cover',
    }
  ): Promise<ImageUploadResult> {
    this.validateFile(file);

    const fileName = `${uuidv4()}.jpg`;

    const mainImage = await this.processImage(file.buffer, mainImageOptions);
    const thumbnail = await this.processImage(file.buffer, thumbnailOptions);

    const mainPath = `${folder}/${fileName}`;
    const thumbPath = `${folder}/thumb-${fileName}`;

    await this.saveToStorage(mainPath, mainImage);
    await this.saveToStorage(thumbPath, thumbnail);

    return {
      imageUrl: this.getPublicUrl(mainPath),
      thumbnailUrl: this.getPublicUrl(thumbPath),
    };
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string,
    maxFiles: number = 5,
    mainImageOptions?: ImageProcessingOptions,
    thumbnailOptions?: ImageProcessingOptions
  ): Promise<ImageUploadResult[]> {
    if (files.length > maxFiles) {
      throw new Error(`Maximum ${maxFiles} images allowed`);
    }

    const uploadPromises = files.map((file) =>
      this.uploadImage(file, folder, mainImageOptions, thumbnailOptions)
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Upload product image
   */
  async uploadProductImage(
    file: Express.Multer.File,
    productSlug: string
  ): Promise<ImageUploadResult> {
    return this.uploadImage(file, `products/${productSlug}`, {
      width: 1200,
      height: 1200,
      quality: 85,
      fit: 'inside',
    });
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(
    file: Express.Multer.File,
    authId: string
  ): Promise<ImageUploadResult> {
    const folder = `profiles/${authId}`;

    const avatar = await this.processImage(file.buffer, {
      width: 400,
      height: 400,
      quality: 90,
      fit: 'cover',
    });

    const thumbnail = await this.processImage(file.buffer, {
      width: 100,
      height: 100,
      quality: 85,
      fit: 'cover',
    });

    const avatarPath = `${folder}/avatar.jpg`;
    const thumbPath = `${folder}/avatar-thumb.jpg`;

    await this.saveToStorage(avatarPath, avatar);
    await this.saveToStorage(thumbPath, thumbnail);

    return {
      imageUrl: this.getPublicUrl(avatarPath),
      thumbnailUrl: this.getPublicUrl(thumbPath),
    };
  }

  /**
   * Upload review images
   */
  async uploadReviewImages(
    files: Express.Multer.File[],
    reviewId: string
  ): Promise<ImageUploadResult[]> {
    return this.uploadMultipleImages(
      files,
      `reviews/${reviewId}`,
      5,
      { width: 800, height: 800, quality: 85, fit: 'inside' },
      { width: 150, height: 150, quality: 80, fit: 'cover' }
    );
  }

  /**
   * Delete a single image file
   */
  async deleteImage(filePath: string): Promise<void> {
    try {
      await bucket.file(filePath).delete();
      this.logger.log(`Deleted image: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete ${filePath}:`, error.message);
      throw new Error(`Failed to delete image: ${error.message}`);
    }
  }

  /**
   * Delete all files in a folder
   */
  async deleteFolder(folderPath: string): Promise<void> {
    try {
      const [files] = await bucket.getFiles({ prefix: folderPath });

      if (files.length === 0) {
        this.logger.warn(`No files found in folder: ${folderPath}`);
        return;
      }

      await Promise.all(files.map((file) => file.delete()));
      this.logger.log(`Deleted folder: ${folderPath} (${files.length} files)`);
    } catch (error) {
      this.logger.error(`Failed to delete folder ${folderPath}:`, error.message);
      throw new Error(`Failed to delete folder: ${error.message}`);
    }
  }

  /**
   * Delete image and its thumbnail
   */
  async deleteImageWithThumbnail(imageUrl: string): Promise<void> {
    const filePath = this.extractPathFromUrl(imageUrl);
    const thumbPath = filePath.replace(/([^/]+)$/, 'thumb-$1');

    await Promise.all([
      this.deleteImage(filePath).catch(() => {}),
      this.deleteImage(thumbPath).catch(() => {}),
    ]);
  }

  /**
   * Process image with sharp
   */
  private async processImage(
    buffer: Buffer,
    options: ImageProcessingOptions
  ): Promise<Buffer> {
    return sharp(buffer)
      .resize(options.width, options.height, {
        fit: options.fit || 'cover',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: options.quality,
        progressive: true,
      })
      .toBuffer();
  }

  /**
   * Save file to cloud storage
   */
  private async saveToStorage(
    filePath: string,
    buffer: Buffer
  ): Promise<void> {
    try {
      await bucket.file(filePath).save(buffer, {
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
        },
        public: true,
      });
      this.logger.log(`Uploaded: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to upload ${filePath}:`, error.message);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Get public URL for a file
   */
  private getPublicUrl(filePath: string): string {
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      const emulatorHost = process.env.GCS_EMULATOR_HOST || 'http://localhost:4443';
      return `${emulatorHost}/${bucketName}/${filePath}`;
    }

    return `https://storage.googleapis.com/${bucketName}/${filePath}`;
  }

  /**
   * Extract file path from public URL
   */
  private extractPathFromUrl(url: string): string {
    const bucketPattern = new RegExp(`/${bucketName}/(.+)$`);
    const match = url.match(bucketPattern);

    if (!match) {
      throw new Error('Invalid image URL');
    }

    return match[1];
  }

  /**
   * Validate uploaded file
   */
  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new Error('No file provided');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(
        `Invalid file type. Allowed: ${allowedMimeTypes.join(', ')}`
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit');
    }
  }
}
