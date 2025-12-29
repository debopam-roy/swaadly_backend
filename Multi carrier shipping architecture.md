# Multi-Carrier Shipping System Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Design Patterns](#design-patterns)
4. [System Components](#system-components)
5. [Database Design](#database-design)
6. [Implementation Guide](#implementation-guide)
7. [Code Organization](#code-organization)
8. [Testing Strategy](#testing-strategy)

---

## System Overview

### Purpose
Build a carrier-agnostic shipping orchestration system that:
- Supports multiple shipping partners (Shipmozo, Delhivery, DTDC, Pushpak)
- Automatically selects optimal carrier based on business rules
- Provides unified API to frontend (users don't know which carrier)
- Easily extensible for adding new carriers
- Fault-tolerant with fallback mechanisms

### High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                   USER-FACING API LAYER                        │
│  ┌─────────────────────────────────────────────────────┐      │
│  │  POST /shipping/rates                                │      │
│  │  POST /shipping/shipments                            │      │
│  │  GET  /shipping/track/:orderId                       │      │
│  └─────────────────────────────────────────────────────┘      │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ↓
┌───────────────────────────────────────────────────────────────┐
│              ORCHESTRATION LAYER (Business Logic)              │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ ShippingService  │  │ CarrierSelector  │                   │
│  │ (Main Facade)    │  │ (Selection Logic)│                   │
│  └──────────────────┘  └──────────────────┘                   │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ RateAggregator   │  │ FallbackHandler  │                   │
│  └──────────────────┘  └──────────────────┘                   │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ↓
┌───────────────────────────────────────────────────────────────┐
│                    ADAPTER LAYER (Abstraction)                 │
│  ┌─────────────────────────────────────────────────────┐      │
│  │          BaseCarrierAdapter (Abstract)              │      │
│  │  + checkServiceability()                            │      │
│  │  + getRates()                                       │      │
│  │  + createShipment()                                 │      │
│  │  + trackShipment()                                  │      │
│  │  + cancelShipment()                                 │      │
│  └─────────────────────────────────────────────────────┘      │
│           ↑            ↑            ↑            ↑             │
│           │            │            │            │             │
│  ┌────────┴───┐  ┌────┴─────┐  ┌──┴──────┐  ┌─┴────────┐    │
│  │ Shipmozo   │  │Delhivery │  │  DTDC   │  │ Pushpak  │    │
│  │ Adapter    │  │ Adapter  │  │ Adapter │  │ Adapter  │    │
│  └────────────┘  └──────────┘  └─────────┘  └──────────┘    │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ↓
┌───────────────────────────────────────────────────────────────┐
│              EXTERNAL CARRIER APIs                             │
│  Shipmozo API  │  Delhivery API  │  DTDC API  │  Pushpak API │
└───────────────────────────────────────────────────────────────┘
```

---

## Architecture Principles

### 1. SOLID Principles

#### S - Single Responsibility Principle (SRP)
**"Each class should have one, and only one, reason to change."**

**Applied:**
```typescript
// ✅ GOOD: Each class has one responsibility
class ShipmozoAdapter {
  // Only responsible for Shipmozo API communication
}

class CarrierSelector {
  // Only responsible for selecting best carrier
}

class RateAggregator {
  // Only responsible for aggregating rates from multiple carriers
}

// ❌ BAD: Multiple responsibilities
class ShippingService {
  // Handles API calls, business logic, DB operations, logging - TOO MUCH!
}
```

**Implementation:**
- `ShippingService`: Orchestrates workflow
- `CarrierSelector`: Business logic for carrier selection
- `BaseCarrierAdapter`: Defines carrier interface
- `ShipmozoAdapter`: Shipmozo-specific implementation
- Each entity/service has single, well-defined purpose

---

#### O - Open/Closed Principle (OCP)
**"Open for extension, closed for modification."**

**Applied:**
```typescript
// ✅ GOOD: Add new carrier without modifying existing code
abstract class BaseCarrierAdapter {
  abstract getRates(): Promise<CarrierRate[]>;
  // ... other methods
}

// Add new carrier by extending, not modifying
class NewCarrierAdapter extends BaseCarrierAdapter {
  async getRates(): Promise<CarrierRate[]> {
    // New carrier implementation
  }
}

// Register in module without changing ShippingService
@Module({
  providers: [
    ShippingService,
    ShipmozoAdapter,
    DelhiveryAdapter,
    NewCarrierAdapter, // Just add here
  ],
})
export class ShippingModule {}
```

**Benefits:**
- Add new carriers without touching core logic
- Modify carrier-specific logic without affecting others
- System grows without rewriting existing code

---

#### L - Liskov Substitution Principle (LSP)
**"Derived classes must be substitutable for their base classes."**

**Applied:**
```typescript
// ✅ GOOD: All adapters can be used interchangeably
function processShipment(carrier: BaseCarrierAdapter, request: ShipmentRequest) {
  // Works with ANY carrier adapter
  const rates = await carrier.getRates(request);
  const shipment = await carrier.createShipment(request);
  const tracking = await carrier.trackShipment(trackingNumber);
}

// All adapters follow same contract
const adapters: BaseCarrierAdapter[] = [
  new ShipmozoAdapter(),
  new DelhiveryAdapter(),
  new DTDCAdapter(),
];

// Can iterate through any adapter without knowing implementation
for (const adapter of adapters) {
  await adapter.getRates(request); // Same interface
}
```

**Key:**
- Every carrier adapter honors the base contract
- Swap carriers without changing client code
- Polymorphism enables flexibility

---

#### I - Interface Segregation Principle (ISP)
**"No client should be forced to depend on methods it does not use."**

**Applied:**
```typescript
// ✅ GOOD: Segregated interfaces
interface IServiceabilityChecker {
  checkServiceability(pickup: string, delivery: string): Promise<boolean>;
}

interface IRateProvider {
  getRates(request: RateRequest): Promise<CarrierRate[]>;
}

interface IShipmentCreator {
  createShipment(request: ShipmentRequest): Promise<ShipmentResponse>;
}

interface ITrackingProvider {
  trackShipment(trackingNumber: string): Promise<TrackingStatus>;
}

// Carrier implements only what it supports
class BasicCarrier implements IServiceabilityChecker, IRateProvider {
  // No shipment creation - this carrier only shows rates
}

// ❌ BAD: Forcing all methods
interface ICarrier {
  createShipment(); // What if carrier only provides rates?
  schedulePickup(); // What if pickup is automatic?
  generateLabel();  // What if carrier doesn't support labels?
}
```

**In Our System:**
- Base adapter includes all methods
- But mark optional methods clearly
- Adapters can throw `NotSupportedError` for unsupported features

---

#### D - Dependency Inversion Principle (DIP)
**"Depend on abstractions, not concretions."**

**Applied:**
```typescript
// ✅ GOOD: Depend on abstraction
class ShippingService {
  constructor(
    @Inject('CARRIERS')
    private carriers: BaseCarrierAdapter[], // Abstraction
    private carrierSelector: CarrierSelector,
  ) {}
  
  async createShipment(request: ShipmentRequest) {
    // Works with ANY carrier that implements BaseCarrierAdapter
    const rates = await this.getAllRates(request);
    const selected = this.carrierSelector.selectBest(rates);
    // ...
  }
}

// ❌ BAD: Depend on concrete implementations
class ShippingService {
  constructor(
    private shipmozo: ShipmozoAdapter,    // Concrete
    private delhivery: DelhiveryAdapter,  // Concrete
  ) {}
  
  async createShipment() {
    // Tightly coupled - can't add carriers without modifying this
    if (condition) {
      return this.shipmozo.create();
    } else {
      return this.delhivery.create();
    }
  }
}
```

**Implementation:**
- Controllers depend on `ShippingService` (abstraction)
- `ShippingService` depends on `BaseCarrierAdapter[]` (abstraction)
- Concrete adapters injected via DI container
- Easy to mock for testing

---

### 2. DRY Principle (Don't Repeat Yourself)

**"Every piece of knowledge must have a single, unambiguous representation."**

**Applied:**

```typescript
// ✅ GOOD: Shared logic in base class
abstract class BaseCarrierAdapter {
  // Shared status normalization
  protected normalizeStatus(carrierStatus: string): string {
    const statusMap = {
      'pending': 'PENDING',
      'in_transit': 'IN_TRANSIT',
      // ... common mappings
    };
    return statusMap[carrierStatus.toLowerCase()] || 'UNKNOWN';
  }
  
  // Shared error handling
  protected async handleAPIError(error: any): Promise<void> {
    if (error.code === 'NETWORK_ERROR') {
      await this.retryWithBackoff();
    }
    // ... common error handling
  }
}

// All adapters reuse these methods
class ShipmozoAdapter extends BaseCarrierAdapter {
  async trackShipment(trackingNumber: string) {
    try {
      const data = await this.fetchTracking(trackingNumber);
      return {
        ...data,
        statusCode: this.normalizeStatus(data.status), // Reuse
      };
    } catch (error) {
      await this.handleAPIError(error); // Reuse
    }
  }
}
```

**Common Code Extraction:**
- Status normalization logic
- Error handling
- Retry mechanisms
- Logging utilities
- Validation helpers

---

### 3. YAGNI Principle (You Aren't Gonna Need It)

**"Don't add functionality until it's necessary."**

**Applied:**

```typescript
// ✅ GOOD: Simple, focused implementation
class CarrierSelector {
  selectBestCarrier(rates: CarrierRate[]): CarrierRate {
    // Start simple - just select cheapest
    return rates.reduce((min, curr) => 
      curr.rate < min.rate ? curr : min
    );
  }
}

// Add complexity ONLY when needed
class CarrierSelector {
  selectBestCarrier(
    rates: CarrierRate[],
    criteria?: SelectionCriteria // Optional - add when needed
  ): CarrierRate {
    if (!criteria) {
      return rates[0]; // Simple default
    }
    
    // Advanced logic only if criteria provided
    return this.scoreAndSelect(rates, criteria);
  }
}

// ❌ BAD: Over-engineering for future
class CarrierSelector {
  // ML model for carrier selection - maybe never needed!
  private aiModel: CarrierAIModel;
  
  // Complex caching - maybe not needed yet
  private distributedCache: RedisCache;
  
  // A/B testing framework - definitely YAGNI
  private abTestingEngine: ABTestEngine;
}
```

**Guidelines:**
- Start with simplest solution
- Add features when there's real need
- Don't build for hypothetical scenarios
- Refactor when requirements change

---

## Design Patterns

### 1. Adapter Pattern
**Purpose:** Convert carrier-specific APIs to common interface

```typescript
// Common interface all carriers must follow
interface ICarrier {
  getRates(request: RateRequest): Promise<CarrierRate[]>;
  createShipment(request: ShipmentRequest): Promise<ShipmentResponse>;
}

// Shipmozo has different API structure
class ShipmozoAPI {
  rateCalculator(params: ShipmozoRateParams) { /* ... */ }
  pushOrder(data: ShipmozoPushOrder) { /* ... */ }
}

// Adapter converts Shipmozo API to our interface
class ShipmozoAdapter implements ICarrier {
  private api: ShipmozoAPI;
  
  async getRates(request: RateRequest): Promise<CarrierRate[]> {
    // Convert our format to Shipmozo format
    const shipmozoParams = this.convertToShipmozoFormat(request);
    
    // Call Shipmozo API
    const result = await this.api.rateCalculator(shipmozoParams);
    
    // Convert Shipmozo response to our format
    return this.convertFromShipmozoFormat(result);
  }
}
```

**Benefits:**
- Isolate carrier-specific logic
- Easy to swap carriers
- Consistent interface for all carriers

---

### 2. Strategy Pattern
**Purpose:** Select carrier dynamically based on business rules

```typescript
// Strategy interface
interface ICarrierSelectionStrategy {
  select(rates: CarrierRate[], context: SelectionContext): CarrierRate;
}

// Different strategies
class CheapestCarrierStrategy implements ICarrierSelectionStrategy {
  select(rates: CarrierRate[]): CarrierRate {
    return rates.reduce((min, curr) => curr.rate < min.rate ? curr : min);
  }
}

class FastestCarrierStrategy implements ICarrierSelectionStrategy {
  select(rates: CarrierRate[]): CarrierRate {
    return rates.reduce((fastest, curr) => 
      this.getDays(curr) < this.getDays(fastest) ? curr : fastest
    );
  }
}

class RegionalCarrierStrategy implements ICarrierSelectionStrategy {
  select(rates: CarrierRate[], context: SelectionContext): CarrierRate {
    // Use Pushpak for Rajasthan
    if (context.deliveryPincode.startsWith('30')) {
      return rates.find(r => r.carrierType === 'pushpak') || rates[0];
    }
    return rates[0];
  }
}

// Context uses strategy
class CarrierSelector {
  constructor(private strategy: ICarrierSelectionStrategy) {}
  
  setStrategy(strategy: ICarrierSelectionStrategy) {
    this.strategy = strategy;
  }
  
  selectBest(rates: CarrierRate[], context: SelectionContext): CarrierRate {
    return this.strategy.select(rates, context);
  }
}
```

**Usage:**
```typescript
const selector = new CarrierSelector(new RegionalCarrierStrategy());
const bestCarrier = selector.selectBest(rates, context);

// Change strategy at runtime
selector.setStrategy(new CheapestCarrierStrategy());
```

---

### 3. Facade Pattern
**Purpose:** Provide simple interface to complex subsystem

```typescript
// Complex subsystem
class RateAggregator { /* ... */ }
class CarrierSelector { /* ... */ }
class ShipmentCreator { /* ... */ }
class TrackingService { /* ... */ }

// Facade provides simple interface
class ShippingService {
  constructor(
    private rateAggregator: RateAggregator,
    private carrierSelector: CarrierSelector,
    private shipmentCreator: ShipmentCreator,
    private trackingService: TrackingService,
  ) {}
  
  // Simple method hides complex workflow
  async fulfillOrder(request: OrderRequest) {
    // 1. Get all rates
    const rates = await this.rateAggregator.aggregateRates(request);
    
    // 2. Select best carrier
    const selectedCarrier = await this.carrierSelector.selectBest(rates);
    
    // 3. Create shipment
    const shipment = await this.shipmentCreator.create(request, selectedCarrier);
    
    // 4. Start tracking
    await this.trackingService.startTracking(shipment.trackingNumber);
    
    return shipment;
  }
}

// Controller only knows facade
@Controller('shipping')
class ShippingController {
  constructor(private shippingService: ShippingService) {}
  
  @Post('fulfill')
  async fulfill(@Body() request: OrderRequest) {
    // Simple call - complexity hidden
    return this.shippingService.fulfillOrder(request);
  }
}
```

---

### 4. Factory Pattern
**Purpose:** Create carrier adapters without exposing creation logic

```typescript
// Factory creates adapters
class CarrierAdapterFactory {
  private adapters = new Map<CarrierType, BaseCarrierAdapter>();
  
  constructor(
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.registerAdapters();
  }
  
  private registerAdapters() {
    this.adapters.set(
      CarrierType.SHIPMOZO,
      new ShipmozoAdapter(this.configService, this.httpService)
    );
    this.adapters.set(
      CarrierType.DELHIVERY,
      new DelhiveryAdapter(this.configService, this.httpService)
    );
    // ... register all adapters
  }
  
  getAdapter(type: CarrierType): BaseCarrierAdapter {
    const adapter = this.adapters.get(type);
    if (!adapter) {
      throw new Error(`Adapter for ${type} not found`);
    }
    return adapter;
  }
  
  getAllAdapters(): BaseCarrierAdapter[] {
    return Array.from(this.adapters.values());
  }
}

// Usage
class ShippingService {
  constructor(private factory: CarrierAdapterFactory) {}
  
  async getRates(request: RateRequest) {
    // Get all adapters from factory
    const adapters = this.factory.getAllAdapters();
    
    const ratePromises = adapters.map(adapter => adapter.getRates(request));
    return Promise.all(ratePromises);
  }
}
```

---

### 5. Repository Pattern
**Purpose:** Abstract data access layer

```typescript
// Repository interface
interface IShipmentRepository {
  findByOrderId(orderId: string): Promise<Shipment | null>;
  save(shipment: Shipment): Promise<Shipment>;
  findActiveShipments(): Promise<Shipment[]>;
  updateStatus(id: number, status: string): Promise<void>;
}

// Implementation
@Injectable()
class ShipmentRepository implements IShipmentRepository {
  constructor(
    @InjectRepository(Shipment)
    private repo: Repository<Shipment>,
  ) {}
  
  async findByOrderId(orderId: string): Promise<Shipment | null> {
    return this.repo.findOne({ where: { orderId } });
  }
  
  async save(shipment: Shipment): Promise<Shipment> {
    return this.repo.save(shipment);
  }
  
  async findActiveShipments(): Promise<Shipment[]> {
    return this.repo.find({
      where: {
        isActive: true,
        currentStatus: In(['PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY']),
      },
    });
  }
}

// Service uses repository
class ShippingService {
  constructor(private shipmentRepo: IShipmentRepository) {}
  
  async trackOrder(orderId: string) {
    const shipment = await this.shipmentRepo.findByOrderId(orderId);
    // ... tracking logic
  }
}
```

**Benefits:**
- Easy to swap database (PostgreSQL → MongoDB)
- Easy to mock for testing
- Centralized query logic

---

## System Components

### Component Hierarchy

```
ShippingModule
├── Controllers
│   └── ShippingController (API endpoints)
│
├── Services
│   ├── ShippingService (Main orchestrator - Facade)
│   ├── RateAggregatorService (Aggregate rates from all carriers)
│   ├── CarrierSelectorService (Business logic for carrier selection)
│   └── FallbackHandlerService (Handle carrier failures)
│
├── Adapters (Carrier implementations)
│   ├── BaseCarrierAdapter (Abstract base class)
│   ├── ShipmozoAdapter
│   ├── DelhiveryAdapter
│   ├── DTDCAdapter
│   └── PushpakAdapter
│
├── Repositories
│   ├── ShipmentRepository
│   └── TrackingEventRepository
│
├── Entities
│   ├── Shipment
│   └── TrackingEvent
│
├── DTOs
│   ├── ShipmentRequestDto
│   ├── RateRequestDto
│   └── TrackingResponseDto
│
└── Types & Interfaces
    ├── carrier.types.ts
    └── shipping.types.ts
```

---

### Component Details

#### 1. BaseCarrierAdapter (Abstract Class)

```typescript
// adapters/base-carrier.adapter.ts

export enum CarrierType {
  SHIPMOZO = 'shipmozo',
  DELHIVERY = 'delhivery',
  DTDC = 'dtdc',
  PUSHPAK = 'pushpak',
}

export interface RateRequest {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number;
  dimensions: { length: number; width: number; height: number };
  paymentType: 'PREPAID' | 'COD';
  orderAmount: number;
  codAmount?: number;
}

export interface CarrierRate {
  carrierId: string;
  carrierName: string;
  carrierType: CarrierType;
  serviceType: string;
  rate: number;
  estimatedDeliveryDays: string;
  codAvailable: boolean;
  metadata?: Record<string, any>;
}

export interface ShipmentRequest extends RateRequest {
  orderId: string;
  orderDate: string;
  customerDetails: {
    name: string;
    phone: string;
    email?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
  };
  products: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
  }>;
  warehouseId?: string;
}

export interface ShipmentResponse {
  success: boolean;
  trackingNumber: string;
  carrierId: string;
  carrierName: string;
  estimatedDelivery?: string;
  labelUrl?: string;
  metadata?: Record<string, any>;
}

export interface TrackingStatus {
  trackingNumber: string;
  currentStatus: string;
  statusCode: string;
  expectedDeliveryDate?: string;
  location?: string;
  lastUpdated: Date;
  events: Array<{
    status: string;
    location: string;
    timestamp: Date;
    remarks?: string;
  }>;
}

export abstract class BaseCarrierAdapter {
  abstract readonly carrierType: CarrierType;
  abstract readonly carrierName: string;

  /**
   * Check if carrier services this route
   */
  abstract checkServiceability(
    pickupPincode: string,
    deliveryPincode: string,
  ): Promise<boolean>;

  /**
   * Get shipping rates for given request
   */
  abstract getRates(request: RateRequest): Promise<CarrierRate[]>;

  /**
   * Create shipment with carrier
   */
  abstract createShipment(request: ShipmentRequest): Promise<ShipmentResponse>;

  /**
   * Track shipment status
   */
  abstract trackShipment(trackingNumber: string): Promise<TrackingStatus>;

  /**
   * Cancel shipment
   */
  abstract cancelShipment(trackingNumber: string): Promise<boolean>;

  /**
   * Normalize carrier-specific status to standard codes
   */
  protected normalizeStatus(carrierStatus: string): string {
    const statusMap: Record<string, string> = {
      // Pending
      'pending': 'PENDING',
      'pickup_pending': 'PENDING',
      'order_placed': 'PENDING',
      
      // In transit
      'in_transit': 'IN_TRANSIT',
      'shipped': 'IN_TRANSIT',
      'picked_up': 'IN_TRANSIT',
      
      // Out for delivery
      'out_for_delivery': 'OUT_FOR_DELIVERY',
      
      // Delivered
      'delivered': 'DELIVERED',
      
      // Failed/Cancelled
      'cancelled': 'CANCELLED',
      'rto': 'RETURNED',
      'failed': 'FAILED',
    };

    const normalized = carrierStatus.toLowerCase().replace(/\s+/g, '_');
    return statusMap[normalized] || 'UNKNOWN';
  }

  /**
   * Common error handling with retry logic
   */
  protected async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Validate common request parameters
   */
  protected validateRequest(request: RateRequest): void {
    if (!/^\d{6}$/.test(request.pickupPincode)) {
      throw new Error('Invalid pickup pincode');
    }
    
    if (!/^\d{6}$/.test(request.deliveryPincode)) {
      throw new Error('Invalid delivery pincode');
    }
    
    if (request.weight <= 0 || request.weight > 50000) {
      throw new Error('Weight must be between 1-50000 grams');
    }
    
    if (request.orderAmount <= 0) {
      throw new Error('Order amount must be positive');
    }
  }
}
```

---

#### 2. CarrierSelectorService

```typescript
// services/carrier-selector.service.ts

export interface SelectionCriteria {
  pickupPincode: string;
  deliveryPincode: string;
  weight: number;
  orderValue: number;
}

export interface CarrierPreference {
  pincodePrefixes: string[];
  states?: string[];
  preferredCarrier: CarrierType;
  priority: number;
}

@Injectable()
export class CarrierSelectorService {
  private readonly logger = new Logger(CarrierSelectorService.name);

  // Business rules for carrier selection
  private readonly regionalPreferences: CarrierPreference[] = [
    {
      // Pushpak for Rajasthan
      pincodePrefixes: ['30', '31', '32', '33', '34'],
      states: ['Rajasthan'],
      preferredCarrier: CarrierType.PUSHPAK,
      priority: 1,
    },
    {
      // Delhivery for Delhi NCR
      pincodePrefixes: ['11', '12', '13', '14', '20', '21'],
      states: ['Delhi', 'Haryana', 'Uttar Pradesh'],
      preferredCarrier: CarrierType.DELHIVERY,
      priority: 2,
    },
  ];

  /**
   * Select best carrier based on business rules
   */
  selectBestCarrier(
    rates: CarrierRate[],
    criteria: SelectionCriteria,
  ): CarrierRate {
    if (rates.length === 0) {
      throw new Error('No carriers available');
    }

    // 1. Try regional preference
    const regional = this.applyRegionalPreference(rates, criteria.deliveryPincode);
    if (regional) {
      this.logger.log(`Selected ${regional.carrierName} (regional preference)`);
      return regional;
    }

    // 2. Score and select best overall
    const scored = this.scoreCarriers(rates, criteria);
    this.logger.log(`Selected ${scored[0].carrierName} (score: ${scored[0].score})`);
    
    return scored[0];
  }

  private applyRegionalPreference(
    rates: CarrierRate[],
    deliveryPincode: string,
  ): CarrierRate | null {
    // Sort preferences by priority
    const sorted = [...this.regionalPreferences].sort((a, b) => a.priority - b.priority);

    for (const pref of sorted) {
      for (const prefix of pref.pincodePrefixes) {
        if (deliveryPincode.startsWith(prefix)) {
          const preferred = rates.find(r => r.carrierType === pref.preferredCarrier);
          if (preferred) return preferred;
        }
      }
    }

    return null;
  }

  private scoreCarriers(
    rates: CarrierRate[],
    criteria: SelectionCriteria,
  ): (CarrierRate & { score: number })[] {
    const scored = rates.map(rate => ({
      ...rate,
      score: this.calculateScore(rate, criteria),
    }));

    // Sort by score (lower is better)
    return scored.sort((a, b) => a.score - b.score);
  }

  private calculateScore(rate: CarrierRate, criteria: SelectionCriteria): number {
    // Weights for different factors
    const PRICE_WEIGHT = 0.5;
    const SPEED_WEIGHT = 0.3;
    const RELIABILITY_WEIGHT = 0.2;

    // Price score (normalize to 0-100)
    const priceScore = (rate.rate / 100) * 100;

    // Speed score
    const avgDays = this.parseDeliveryDays(rate.estimatedDeliveryDays);
    const speedScore = avgDays * 20;

    // Reliability score (based on carrier reputation)
    const reliabilityScore = this.getReliabilityScore(rate.carrierType);

    return (
      priceScore * PRICE_WEIGHT +
      speedScore * SPEED_WEIGHT +
      reliabilityScore * RELIABILITY_WEIGHT
    );
  }

  private parseDeliveryDays(deliveryString: string): number {
    const match = deliveryString.match(/(\d+)-?(\d+)?/);
    if (!match) return 5;

    const min = parseInt(match[1]);
    const max = match[2] ? parseInt(match[2]) : min;
    return (min + max) / 2;
  }

  private getReliabilityScore(carrierType: CarrierType): number {
    // Based on experience (lower = better)
    const scores: Record<CarrierType, number> = {
      [CarrierType.PUSHPAK]: 10,
      [CarrierType.DELHIVERY]: 15,
      [CarrierType.SHIPMOZO]: 20,
      [CarrierType.DTDC]: 25,
    };
    return scores[carrierType] || 30;
  }
}
```

---

#### 3. ShippingService (Main Orchestrator)

```typescript
// shipping.service.ts

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);
  private readonly carriers: BaseCarrierAdapter[];

  constructor(
    @InjectRepository(Shipment)
    private shipmentRepo: Repository<Shipment>,
    private carrierSelector: CarrierSelectorService,
    private rateAggregator: RateAggregatorService,
    // Inject all carrier adapters
    private shipmozoAdapter: ShipmozoAdapter,
    private delhiveryAdapter: DelhiveryAdapter,
    private dtdcAdapter: DTDCAdapter,
    private pushpakAdapter: PushpakAdapter,
  ) {
    this.carriers = [
      this.shipmozoAdapter,
      this.delhiveryAdapter,
      this.dtdcAdapter,
      this.pushpakAdapter,
    ];
  }

  /**
   * Get delivery options for checkout page
   * Returns user-friendly options (hides carrier details)
   */
  async getDeliveryOptions(request: RateRequest) {
    const rates = await this.rateAggregator.aggregateRates(this.carriers, request);

    if (rates.length === 0) {
      throw new BadRequestException('No delivery options available');
    }

    // Return simplified options for user
    return rates
      .sort((a, b) => a.rate - b.rate)
      .map((rate, index) => ({
        id: `${rate.carrierType}_${rate.carrierId}`,
        name: `${rate.estimatedDeliveryDays} Delivery`,
        deliveryTime: rate.estimatedDeliveryDays,
        price: rate.rate,
        recommended: index === 0, // Mark cheapest as recommended
      }));
  }

  /**
   * Create shipment with automatic carrier selection
   */
  async createShipment(request: ShipmentRequest) {
    try {
      // 1. Get all rates
      const rates = await this.rateAggregator.aggregateRates(this.carriers, request);

      // 2. Select best carrier
      const selectedRate = this.carrierSelector.selectBestCarrier(rates, {
        pickupPincode: request.pickupPincode,
        deliveryPincode: request.deliveryPincode,
        weight: request.weight,
        orderValue: request.orderAmount,
      });

      // 3. Find adapter
      const adapter = this.carriers.find(c => c.carrierType === selectedRate.carrierType);

      // 4. Create shipment
      const response = await adapter.createShipment(request);

      // 5. Save to database
      const shipment = this.shipmentRepo.create({
        orderId: request.orderId,
        carrierType: selectedRate.carrierType,
        carrierName: selectedRate.carrierName,
        trackingNumber: response.trackingNumber,
        currentStatus: 'PENDING',
        estimatedDeliveryDays: selectedRate.estimatedDeliveryDays,
        shippingCost: selectedRate.rate,
        metadata: response.metadata,
        isActive: true,
      });

      await this.shipmentRepo.save(shipment);

      this.logger.log(
        `Shipment created for order ${request.orderId} with ${selectedRate.carrierName}`,
      );

      return {
        success: true,
        orderId: request.orderId,
        trackingNumber: response.trackingNumber,
        estimatedDelivery: selectedRate.estimatedDeliveryDays,
        shippingCost: selectedRate.rate,
      };
    } catch (error) {
      this.logger.error(`Shipment creation failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to create shipment');
    }
  }

  /**
   * Track shipment - unified interface
   */
  async trackShipment(orderId: string) {
    const shipment = await this.shipmentRepo.findOne({ where: { orderId } });

    if (!shipment) {
      throw new NotFoundException('Shipment not found');
    }

    const adapter = this.carriers.find(c => c.carrierType === shipment.carrierType);
    const tracking = await adapter.trackShipment(shipment.trackingNumber);

    // Update database
    shipment.currentStatus = tracking.statusCode;
    shipment.lastTrackedAt = new Date();
    await this.shipmentRepo.save(shipment);

    return {
      orderId: shipment.orderId,
      status: this.getUserFriendlyStatus(tracking.statusCode),
      expectedDelivery: tracking.expectedDeliveryDate,
      currentLocation: tracking.location,
      timeline: tracking.events,
    };
  }

  private getUserFriendlyStatus(statusCode: string): string {
    const statusMap: Record<string, string> = {
      PENDING: 'Order Confirmed',
      IN_TRANSIT: 'On the Way',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
      RETURNED: 'Returned',
      FAILED: 'Delivery Failed',
    };
    return statusMap[statusCode] || 'Processing';
  }
}
```

---

## Database Design

### Entity Relationship Diagram

```
┌─────────────────────────────────────┐
│           Shipments                 │
├─────────────────────────────────────┤
│ id (PK)                             │
│ orderId (UNIQUE)                    │
│ carrierType (ENUM)                  │
│ carrierName                         │
│ trackingNumber                      │
│ currentStatus                       │
│ estimatedDeliveryDays               │
│ shippingCost                        │
│ metadata (JSONB)                    │
│ isActive                            │
│ lastTrackedAt                       │
│ createdAt                           │
│ updatedAt                           │
└─────────────────────────────────────┘
           │
           │ 1:N
           │
           ↓
┌─────────────────────────────────────┐
│       TrackingEvents                │
├─────────────────────────────────────┤
│ id (PK)                             │
│ shipmentId (FK)                     │
│ status                              │
│ statusCode                          │
│ location                            │
│ timestamp                           │
│ remarks                             │
│ createdAt                           │
└─────────────────────────────────────┘
```

### Entity Definitions

```typescript
// entities/shipment.entity.ts

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  orderId: string;

  @Column({ type: 'enum', enum: CarrierType })
  carrierType: CarrierType;

  @Column()
  carrierName: string;

  @Column()
  trackingNumber: string;

  @Column()
  currentStatus: string;

  @Column({ nullable: true })
  estimatedDeliveryDays: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  shippingCost: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastTrackedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TrackingEvent, event => event.shipment)
  trackingEvents: TrackingEvent[];
}
```

```typescript
// entities/tracking-event.entity.ts

@Entity('tracking_events')
export class TrackingEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Shipment, shipment => shipment.trackingEvents)
  shipment: Shipment;

  @Column()
  status: string;

  @Column()
  statusCode: string;

  @Column({ nullable: true })
  location: string;

  @Column()
  timestamp: Date;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

### Indexes

```sql
-- Shipments table indexes
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(current_status);
CREATE INDEX idx_shipments_active ON shipments(is_active);
CREATE INDEX idx_shipments_created_at ON shipments(created_at);

-- Tracking events indexes
CREATE INDEX idx_tracking_shipment_id ON tracking_events(shipment_id);
CREATE INDEX idx_tracking_timestamp ON tracking_events(timestamp);
```

---

## Implementation Guide

### Step-by-Step Implementation

#### Phase 1: Foundation (Week 1)

1. **Setup Base Structure**
   ```bash
   # Create module
   nest g module shipping
   nest g controller shipping
   nest g service shipping
   ```

2. **Implement Base Adapter**
   - Create `BaseCarrierAdapter` abstract class
   - Define all interfaces (RateRequest, ShipmentRequest, etc.)
   - Add common methods (normalizeStatus, retryWithBackoff)

3. **Setup Database**
   - Create entities (Shipment, TrackingEvent)
   - Run migrations
   - Create repositories

#### Phase 2: First Carrier (Week 1)

4. **Implement Shipmozo Adapter**
   - Create `ShipmozoAdapter` extending `BaseCarrierAdapter`
   - Implement all required methods
   - Add unit tests
   - Add integration tests

5. **Test End-to-End**
   - Test serviceability check
   - Test rate calculation
   - Test shipment creation
   - Test tracking

#### Phase 3: Additional Carriers (Week 2)

6. **Implement Other Adapters**
   - Create `DelhiveryAdapter`
   - Create `DTDCAdapter`
   - Create `PushpakAdapter`
   - Follow same pattern as Shipmozo

7. **Add Carrier Selector**
   - Implement `CarrierSelectorService`
   - Add regional preferences
   - Add scoring logic
   - Add tests

#### Phase 4: Orchestration (Week 2)

8. **Complete ShippingService**
   - Implement rate aggregation
   - Implement shipment creation
   - Implement tracking
   - Add error handling

9. **Add Controller Endpoints**
   - POST /shipping/rates
   - POST /shipping/shipments
   - GET /shipping/track/:orderId

#### Phase 5: Polish (Week 3)

10. **Add Advanced Features**
    - Caching (Redis)
    - Background jobs (Bull)
    - Monitoring (Sentry)
    - Logging (Winston)

11. **Documentation & Testing**
    - API documentation (Swagger)
    - Unit test coverage > 80%
    - Integration tests
    - Load testing

---

## Code Organization

### File Structure

```
src/
└── modules/
    └── shipping/
        ├── shipping.module.ts
        ├── shipping.controller.ts
        ├── shipping.service.ts
        │
        ├── adapters/
        │   ├── base-carrier.adapter.ts         # Abstract base
        │   ├── shipmozo.adapter.ts
        │   ├── delhivery.adapter.ts
        │   ├── dtdc.adapter.ts
        │   └── pushpak.adapter.ts
        │
        ├── services/
        │   ├── rate-aggregator.service.ts
        │   ├── carrier-selector.service.ts
        │   └── fallback-handler.service.ts
        │
        ├── entities/
        │   ├── shipment.entity.ts
        │   └── tracking-event.entity.ts
        │
        ├── repositories/
        │   ├── shipment.repository.ts
        │   └── tracking-event.repository.ts
        │
        ├── dto/
        │   ├── rate-request.dto.ts
        │   ├── shipment-request.dto.ts
        │   ├── tracking-response.dto.ts
        │   └── delivery-option.dto.ts
        │
        ├── types/
        │   ├── carrier.types.ts
        │   ├── shipping.types.ts
        │   └── enums.ts
        │
        ├── exceptions/
        │   ├── carrier-not-available.exception.ts
        │   └── shipment-creation-failed.exception.ts
        │
        └── __tests__/
            ├── unit/
            │   ├── shipping.service.spec.ts
            │   ├── carrier-selector.service.spec.ts
            │   └── shipmozo.adapter.spec.ts
            └── integration/
                └── shipping.e2e.spec.ts
```

### Module Configuration

```typescript
// shipping.module.ts

@Module({
  imports: [
    TypeOrmModule.forFeature([Shipment, TrackingEvent]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [ShippingController],
  providers: [
    // Main services
    ShippingService,
    RateAggregatorService,
    CarrierSelectorService,
    FallbackHandlerService,
    
    // Repositories
    ShipmentRepository,
    TrackingEventRepository,
    
    // Carrier adapters
    ShipmozoAdapter,
    DelhiveryAdapter,
    DTDCAdapter,
    PushpakAdapter,
  ],
  exports: [ShippingService],
})
export class ShippingModule {}
```

---

## Testing Strategy

### Unit Tests

```typescript
// __tests__/unit/carrier-selector.service.spec.ts

describe('CarrierSelectorService', () => {
  let service: CarrierSelectorService;

  beforeEach(() => {
    service = new CarrierSelectorService();
  });

  describe('selectBestCarrier', () => {
    it('should select cheapest carrier when no regional preference', () => {
      const rates: CarrierRate[] = [
        { carrierId: '1', rate: 50, carrierType: CarrierType.DELHIVERY, /* ... */ },
        { carrierId: '2', rate: 30, carrierType: CarrierType.DTDC, /* ... */ },
      ];

      const result = service.selectBestCarrier(rates, {
        pickupPincode: '110001',
        deliveryPincode: '122001',
        weight: 500,
        orderValue: 1000,
      });

      expect(result.carrierId).toBe('2'); // Cheapest
    });

    it('should prefer regional carrier for Rajasthan', () => {
      const rates: CarrierRate[] = [
        { carrierId: '1', rate: 30, carrierType: CarrierType.DELHIVERY, /* ... */ },
        { carrierId: '2', rate: 50, carrierType: CarrierType.PUSHPAK, /* ... */ },
      ];

      const result = service.selectBestCarrier(rates, {
        pickupPincode: '110001',
        deliveryPincode: '302001', // Rajasthan
        weight: 500,
        orderValue: 1000,
      });

      expect(result.carrierType).toBe(CarrierType.PUSHPAK); // Regional preference
    });
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/shipping.e2e.spec.ts

describe('Shipping E2E', () => {
  let app: INestApplication;
  let shipmentRepo: Repository<Shipment>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [ShippingModule, DatabaseModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    shipmentRepo = module.get(getRepositoryToken(Shipment));
  });

  it('should create shipment with best carrier', async () => {
    const request = {
      orderId: 'TEST123',
      pickupPincode: '110001',
      deliveryPincode: '302001',
      weight: 500,
      // ... other fields
    };

    const response = await request(app.getHttpServer())
      .post('/shipping/shipments')
      .send(request)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.trackingNumber).toBeDefined();

    // Verify database
    const shipment = await shipmentRepo.findOne({
      where: { orderId: 'TEST123' },
    });
    expect(shipment).toBeDefined();
    expect(shipment.carrierType).toBe(CarrierType.PUSHPAK); // Regional
  });
});
```

---

## Summary

### Architecture Checklist

✅ **SOLID Principles**
- Single Responsibility: Each class has one job
- Open/Closed: Add carriers without modifying existing code
- Liskov Substitution: All adapters interchangeable
- Interface Segregation: Clean interfaces
- Dependency Inversion: Depend on abstractions

✅ **DRY Principle**
- Shared logic in base classes
- No code duplication across adapters
- Reusable utilities

✅ **YAGNI Principle**
- Start simple, add complexity when needed
- No over-engineering
- Clear, maintainable code

✅ **Design Patterns**
- Adapter: Unify carrier APIs
- Strategy: Dynamic carrier selection
- Facade: Simple public interface
- Factory: Create adapters
- Repository: Abstract data access

✅ **Scalability**
- Easy to add new carriers
- Easy to modify business rules
- Fault-tolerant with fallbacks
- Cacheable and performant

This architecture provides a solid foundation for a production-ready multi-carrier shipping system that's maintainable, extensible, and follows industry best practices.