import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { IMAGE_CONSTRAINTS } from '../common/types/image.types';

export const multerConfig: MulterOptions = {
  storage: undefined, // Use memory storage (buffer)
  limits: {
    fileSize: IMAGE_CONSTRAINTS.MAX_FILE_SIZE,
  },
  fileFilter: (req, file, callback) => {
    if (!IMAGE_CONSTRAINTS.ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      return callback(
        new BadRequestException(
          `Invalid file type. Allowed: ${IMAGE_CONSTRAINTS.ALLOWED_MIME_TYPES.join(', ')}`
        ),
        false
      );
    }
    callback(null, true);
  },
};
