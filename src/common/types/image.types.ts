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

export enum ImageFolder {
  PRODUCTS = 'products',
  PROFILES = 'profiles',
  REVIEWS = 'reviews',
}

export const IMAGE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  MAX_REVIEW_IMAGES: 5,
} as const;

export const IMAGE_PRESETS = {
  PRODUCT: {
    main: { width: 1200, height: 1200, quality: 85, fit: 'inside' as const },
    thumbnail: { width: 300, height: 300, quality: 80, fit: 'cover' as const },
  },
  PROFILE: {
    avatar: { width: 400, height: 400, quality: 90, fit: 'cover' as const },
    thumbnail: { width: 100, height: 100, quality: 85, fit: 'cover' as const },
  },
  REVIEW: {
    main: { width: 800, height: 800, quality: 85, fit: 'inside' as const },
    thumbnail: { width: 150, height: 150, quality: 80, fit: 'cover' as const },
  },
} as const;
