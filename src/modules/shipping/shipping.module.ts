import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

// Services
import {
  CarrierSelectorService,
  RateAggregatorService,
} from './services';

// Adapters
import { ShipmozoAdapter } from './adapters';

// Prisma
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
  controllers: [ShippingController],
  providers: [
    // Main service
    ShippingService,

    // Supporting services
    CarrierSelectorService,
    RateAggregatorService,

    // Carrier adapters
    ShipmozoAdapter,

    // Add more adapters here when implemented:
    // PushpakAdapter,
    // DelhiveryAdapter,
    // DTDCAdapter,
  ],
  exports: [ShippingService],
})
export class ShippingModule {}
