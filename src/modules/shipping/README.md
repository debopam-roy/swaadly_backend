# Multi-Carrier Shipping Module

A carrier-agnostic shipping orchestration system built following SOLID principles, designed to integrate multiple delivery partners with automatic carrier selection.

## Architecture Overview

This module follows a **three-layer architecture**:

1. **API Layer** - ShippingController (user-facing endpoints)
2. **Orchestration Layer** - ShippingService, CarrierSelector, RateAggregator (business logic)
3. **Adapter Layer** - BaseCarrierAdapter, carrier-specific implementations (carrier integration)

## Current Status

### Integrated Carriers
- ✅ **Shipmozo** - Fully integrated
- 🔜 **Pushpak** - Ready to integrate (infrastructure in place)
- 🔜 **Delhivery** - Ready to integrate (infrastructure in place)
- 🔜 **DTDC** - Ready to integrate (infrastructure in place)

## Key Features

- **Automatic Carrier Selection** - Intelligently selects the best carrier based on:
  - Regional preferences (e.g., Pushpak for Rajasthan)
  - Price scoring
  - Delivery speed
  - Carrier reliability

- **Unified API** - Frontend doesn't need to know which carrier is used
- **Easy to Extend** - Add new carriers without modifying existing code
- **Fault Tolerant** - Continues working even if some carriers fail
- **Database Tracking** - Full shipment history and tracking events

## API Endpoints

### 1. Get Delivery Rates
```http
POST /shipping/rates
Content-Type: application/json

{
  "pickupPincode": "110001",
  "deliveryPincode": "302001",
  "weight": 500,
  "dimensions": {
    "length": 10,
    "width": 10,
    "height": 10
  },
  "paymentType": "COD",
  "orderAmount": 1000,
  "codAmount": 1000
}
```

**Response:**
```json
[
  {
    "id": "shipmozo_12345",
    "name": "3-5 days Delivery",
    "deliveryTime": "3-5 days",
    "price": 45.50,
    "recommended": true
  }
]
```

### 2. Create Shipment
```http
POST /shipping/shipments
Content-Type: application/json

{
  "orderId": "ORD123456",
  "orderDate": "2024-12-27",
  "pickupPincode": "110001",
  "deliveryPincode": "302001",
  "weight": 500,
  "paymentType": "COD",
  "orderAmount": 1000,
  "codAmount": 1000,
  "customerDetails": {
    "name": "John Doe",
    "phone": "9876543210",
    "email": "john@example.com",
    "address1": "123 Main Street",
    "address2": "Apartment 4B",
    "city": "Jaipur",
    "state": "Rajasthan"
  },
  "products": [
    {
      "name": "Protein Bar",
      "sku": "PRO-BAR-001",
      "quantity": 2,
      "price": 500
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "ORD123456",
  "trackingNumber": "SHP123456789",
  "estimatedDelivery": "3-5 days",
  "shippingCost": 45.50,
  "carrierName": "Shipmozo"
}
```

### 3. Track Shipment
```http
GET /shipping/track/:orderId
```

**Response:**
```json
{
  "orderId": "ORD123456",
  "trackingNumber": "SHP123456789",
  "carrierName": "Shipmozo",
  "status": "On the Way",
  "statusCode": "IN_TRANSIT",
  "expectedDelivery": "2024-12-30",
  "currentLocation": "Mumbai Hub",
  "lastUpdated": "2024-12-27T10:30:00Z",
  "timeline": [
    {
      "status": "Picked up",
      "location": "Delhi Hub",
      "timestamp": "2024-12-27T09:00:00Z",
      "remarks": "Package picked up from seller"
    },
    {
      "status": "In transit",
      "location": "Mumbai Hub",
      "timestamp": "2024-12-27T10:30:00Z",
      "remarks": "Package in transit to destination"
    }
  ]
}
```

### 4. Cancel Shipment
```http
POST /shipping/cancel/:orderId
```

**Response:**
```json
{
  "success": true,
  "message": "Shipment cancelled successfully"
}
```

## Adding a New Carrier

### Step 1: Create Adapter Class

Create a new file in `src/modules/shipping/adapters/`:

```typescript
// pushpak.adapter.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseCarrierAdapter } from './base-carrier.adapter';
import {
  CarrierType,
  RateRequest,
  CarrierRate,
  ShipmentRequest,
  ShipmentResponse,
  TrackingStatus,
} from '../types';

@Injectable()
export class PushpakAdapter extends BaseCarrierAdapter {
  readonly carrierType = CarrierType.PUSHPAK;
  readonly carrierName = 'Pushpak';

  constructor(private configService: ConfigService) {
    super('PushpakAdapter');
    // Initialize API client
  }

  async checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
  ): Promise<boolean> {
    // Implement Pushpak serviceability check
  }

  async getRates(request: RateRequest): Promise<CarrierRate[]> {
    // Implement Pushpak rate calculation
  }

  async createShipment(request: ShipmentRequest): Promise<ShipmentResponse> {
    // Implement Pushpak shipment creation
  }

  async trackShipment(trackingNumber: string): Promise<TrackingStatus> {
    // Implement Pushpak tracking
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    // Implement Pushpak cancellation
  }
}
```

### Step 2: Register in Module

Update `src/modules/shipping/shipping.module.ts`:

```typescript
import { PushpakAdapter } from './adapters';

@Module({
  providers: [
    ShippingService,
    CarrierSelectorService,
    RateAggregatorService,
    ShipmozoAdapter,
    PushpakAdapter, // Add here
  ],
})
export class ShippingModule {}
```

### Step 3: Update ShippingService

Update `src/modules/shipping/shipping.service.ts`:

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly carrierSelector: CarrierSelectorService,
  private readonly rateAggregator: RateAggregatorService,
  private readonly shipmozoAdapter: ShipmozoAdapter,
  private readonly pushpakAdapter: PushpakAdapter, // Inject here
) {
  this.carriers = [
    this.shipmozoAdapter,
    this.pushpakAdapter, // Add here
  ];
}
```

### Step 4: Add Environment Variables

Add to `.env`:

```env
PUSHPAK_API_KEY=your-api-key
PUSHPAK_API_URL=https://api.pushpak.com/v1
```

That's it! The new carrier is now integrated and will be automatically considered during carrier selection.

## Carrier Selection Logic

The system selects carriers using this priority:

1. **Regional Preferences** (Highest Priority)
   - Pushpak for Rajasthan pincodes (30xxxx, 31xxxx, 32xxxx, 33xxxx, 34xxxx)
   - Delhivery for Delhi NCR (11xxxx, 12xxxx, 13xxxx, 14xxxx, 20xxxx, 21xxxx)

2. **Scoring Algorithm** (If no regional preference)
   - Price (50% weight)
   - Delivery speed (30% weight)
   - Carrier reliability (20% weight)

## Database Schema

### Shipment Table
Stores shipment information:
- Order reference
- Carrier details
- Tracking number
- Current status
- Shipping cost
- Metadata

### ShipmentTrackingEvent Table
Stores tracking history:
- Status updates
- Location information
- Timestamps
- Remarks

## Design Patterns Used

1. **Adapter Pattern** - Unifies different carrier APIs
2. **Strategy Pattern** - Dynamic carrier selection
3. **Facade Pattern** - Simple interface (ShippingService) for complex subsystem
4. **Dependency Injection** - Loose coupling between components

## SOLID Principles Applied

- **Single Responsibility** - Each class has one job
- **Open/Closed** - Add carriers without modifying existing code
- **Liskov Substitution** - All adapters are interchangeable
- **Interface Segregation** - Clean, focused interfaces
- **Dependency Inversion** - Depend on abstractions (BaseCarrierAdapter)

## Testing

### Test Rate Calculation
```bash
curl -X POST http://localhost:5000/shipping/rates \
  -H "Content-Type: application/json" \
  -d '{
    "pickupPincode": "110001",
    "deliveryPincode": "302001",
    "weight": 500,
    "paymentType": "COD",
    "orderAmount": 1000,
    "codAmount": 1000
  }'
```

### Test Shipment Creation
```bash
curl -X POST http://localhost:5000/shipping/shipments \
  -H "Content-Type: application/json" \
  -d @shipment-request.json
```

## Configuration

### Regional Preferences

To add/modify regional preferences, update `carrier-selector.service.ts`:

```typescript
private readonly regionalPreferences: CarrierPreference[] = [
  {
    pincodePrefixes: ['30', '31', '32'],
    states: ['Rajasthan'],
    preferredCarrier: CarrierType.PUSHPAK,
    priority: 1,
  },
  // Add more preferences here
];
```

### Reliability Scores

To adjust carrier reliability scores (affects selection), update `carrier-selector.service.ts`:

```typescript
private getReliabilityScore(carrierType: CarrierType): number {
  const scores: Record<CarrierType, number> = {
    [CarrierType.PUSHPAK]: 10,     // Most reliable
    [CarrierType.DELHIVERY]: 15,
    [CarrierType.SHIPMOZO]: 20,
    [CarrierType.DTDC]: 25,
  };
  return scores[carrierType] || 30;
}
```

## Troubleshooting

### Common Issues

1. **"No carriers available"**
   - Check if carrier credentials are configured in .env
   - Verify carrier API is accessible
   - Check serviceability for the route

2. **"Shipment creation failed"**
   - Validate request payload matches DTO
   - Check carrier API response in logs
   - Verify pickup/delivery pincodes are serviceable

3. **"Tracking information not available"**
   - Wait for carrier to update tracking (may take time after shipment creation)
   - Verify tracking number is correct
   - Check carrier API status

## Future Enhancements

- [ ] Webhook support for automatic tracking updates
- [ ] Rate caching with Redis
- [ ] Bulk shipment creation
- [ ] Label generation and printing
- [ ] Pickup scheduling
- [ ] Return shipment handling
- [ ] Multi-piece shipments
- [ ] International shipping support

## Support

For questions or issues, check:
- Architecture document: [Multi carrier shipping architecture.md](../../Multi%20carrier%20shipping%20architecture.md)
- Code comments in individual files
- NestJS documentation: https://docs.nestjs.com
