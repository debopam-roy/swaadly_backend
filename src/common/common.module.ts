import { Global, Module } from '@nestjs/common';
import { ImageUploadService } from './services/image-upload.service';

@Global()
@Module({
  providers: [ImageUploadService],
  exports: [ImageUploadService],
})
export class CommonModule {}
