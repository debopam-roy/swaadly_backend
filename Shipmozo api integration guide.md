# Shipmozo API Integration Guide

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base Configuration](#base-configuration)
4. [Core API Endpoints](#core-api-endpoints)
5. [API Workflow](#api-workflow)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

---

## Overview

Shipmozo is a shipping aggregator platform that provides access to multiple courier partners through a single API. This document outlines the essential endpoints needed for our e-commerce platform's shipping integration.

**Base URL:** `https://shipping-api.com/app/api/v1`

**Important:** Do NOT include trailing slash (/) in API URLs - it causes CORS issues.

---

## Authentication

All API requests require two headers:

```http
public-key: YOUR_PUBLIC_KEY
private-key: YOUR_PRIVATE_KEY
```

### How to Obtain Keys

**Option 1: Via Login API**
```typescript
POST /login
Body: {
  "username": "your_username",
  "password": "your_password"
}

Response: {
  "result": "1",
  "message": "Success",
  "data": [{
    "name": "Your Name",
    "public_key": "2kIWvh6ZS3Gms1l9Yp4u",
    "private_key": "JY5LAThBCySsVWHZM9oK"
  }]
}
```

**Option 2:** Retrieve from Shipmozo panel → User Profile

---

## Base Configuration

### Environment Variables Required

```env
SHIPMOZO_BASE_URL=https://shipping-api.com/app/api/v1
SHIPMOZO_PUBLIC_KEY=your_public_key_here
SHIPMOZO_PRIVATE_KEY=your_private_key_here
SHIPMOZO_DEFAULT_WAREHOUSE_ID=your_warehouse_id
```

---

## Core API Endpoints

### 1. Pincode Serviceability Check

**Purpose:** Verify if delivery is possible between two pincodes

**Endpoint:** `POST /pincode-serviceability`

**When to Use:**
- Before showing delivery options to user
- During checkout address validation
- When user enters delivery pincode

**Request:**
```typescript
{
  "pickup_pincode": 122001,      // number: Your warehouse pincode
  "delivery_pincode": 110001     // number: Customer's delivery pincode
}
```

**Response:**
```typescript
{
  "result": "1",                 // "1" = success, "0" = failure
  "message": "Success",
  "data": {
    "serviceable": true          // boolean: true if delivery possible
  }
}
```

**Implementation Notes:**
- Always call this BEFORE rate-calculator
- Cache results for 24 hours per pincode pair
- If serviceable = false, don't proceed with rate calculation

---

### 2. Rate Calculator

**Purpose:** Get available courier partners with pricing and delivery estimates

**Endpoint:** `POST /rate-calculator`

**When to Use:**
- After serviceability check passes
- To show delivery options at checkout
- To select best carrier for order

**Request:**
```typescript
{
  "order_id": "",                          // string (optional): Leave empty for rate calculation
  "pickup_pincode": 122001,                // number: Warehouse pincode
  "delivery_pincode": 110001,              // number: Customer pincode
  "payment_type": "PREPAID",               // string: "PREPAID" | "COD"
  "shipment_type": "FORWARD",              // string: "FORWARD" | "RETURN"
  "order_amount": 1000,                    // number: Total order value in INR
  "type_of_package": "SPS",                // string: Always use "SPS" (Standard Package Size)
  "rov_type": "ROV_OWNER",                 // string: Always use "ROV_OWNER"
  "cod_amount": "",                        // string: If COD, same as order_amount, else ""
  "weight": 500,                           // number: Weight in GRAMS
  "dimensions": [{
    "no_of_box": "1",                      // string: Number of boxes
    "length": "22",                        // string: Length in CM
    "width": "10",                         // string: Width in CM
    "height": "10"                         // string: Height in CM
  }]
}
```

**Response:**
```typescript
{
  "result": "1",
  "message": "Success",
  "data": [
    {
      "courier_id": 1,                                    // number: Unique courier identifier
      "courier_name": "Delhivery",                        // string: Courier company name
      "courier_service": "Surface",                       // string: Service type
      "rate": 45.50,                                      // number: Shipping cost in INR
      "estimated_delivery_days": "3-5",                   // string: Delivery time estimate
      "cod_available": true,                              // boolean: COD support
      "pickups_automatically_scheduled": "YES",           // string: "YES" | "NO"
      "minimum_weight": 50,                               // number: Min weight in grams
      "maximum_weight": 50000,                            // number: Max weight in grams
      // ... other fields
    },
    // ... more courier options
  ]
}
```

**Important Response Fields:**

| Field | Type | Description | Usage |
|-------|------|-------------|-------|
| `courier_id` | number | Unique ID for courier | Required for assign-courier API |
| `rate` | number | Shipping cost | Display to user / cost calculation |
| `estimated_delivery_days` | string | Delivery time | Display to user |
| `pickups_automatically_scheduled` | string | Auto-pickup flag | If "NO", call schedule-pickup API |
| `cod_available` | boolean | COD support | Filter COD orders |

**Implementation Notes:**
- Response contains MULTIPLE courier options
- Sort by rate/delivery time based on business logic
- Store courier_id for later assignment
- Cache results for 1 hour per order parameters

---

### 3. Push Order

**Purpose:** Create order in Shipmozo system before assigning courier

**Endpoint:** `POST /push-order`

**When to Use:**
- After user confirms order
- Before assigning courier
- Once per order only

**Request:**
```typescript
{
  "order_id": "ORD123456",                       // string: YOUR unique order ID
  "order_date": "2024-12-27",                    // string: Format YYYY-MM-DD
  "order_type": "ESSENTIALS",                    // string: "ESSENTIALS" | "NON ESSENTIALS"
  
  // Customer Details
  "consignee_name": "John Doe",                  // string: Customer name
  "consignee_phone": 9876543210,                 // number: 10-digit phone
  "consignee_alternate_phone": 9876543211,       // number (optional): Alternate phone
  "consignee_email": "john@example.com",         // string (optional): Email
  "consignee_address_line_one": "Flat 101, Building A", // string: Primary address
  "consignee_address_line_two": "Near Metro Station",   // string (optional): Secondary address
  "consignee_pin_code": 110001,                  // number: Delivery pincode
  "consignee_city": "New Delhi",                 // string: City name
  "consignee_state": "Delhi",                    // string: State name
  
  // Product Details
  "product_detail": [
    {
      "name": "Peanut Butter Crunchy 500g",      // string: Product name
      "sku_number": "PB-CR-500",                 // string: SKU/Product code
      "quantity": 2,                             // number: Quantity
      "unit_price": 299,                         // number: Price per unit in INR
      "discount": "",                            // string (optional): Discount amount
      "hsn": "21069099",                         // string (optional): HSN code
      "product_category": "Other"                // string: Category
    }
    // ... more products
  ],
  
  // Payment & Shipping
  "payment_type": "PREPAID",                     // string: "PREPAID" | "COD"
  "cod_amount": "",                              // string: If COD, total amount as string
  "weight": 1000,                                // number: Total weight in GRAMS
  "length": 20,                                  // number: Package length in CM
  "width": 15,                                   // number: Package width in CM
  "height": 10,                                  // number: Package height in CM
  "warehouse_id": "",                            // string (optional): From get-warehouses API
  
  // GST (Optional)
  "gst_ewaybill_number": "",                     // string (optional): E-way bill
  "gstin_number": ""                             // string (optional): GSTIN
}
```

**Response:**
```typescript
{
  "result": "1",
  "message": "Success",
  "data": {
    "Info": "Order Pushed Successfully",
    "order_id": "ORD123456",                     // Your order ID (echoed back)
    "reference_id": "ORD123456"                  // Shipmozo's reference ID
  }
}
```

**Critical Rules:**
- `order_id` must be UNIQUE across all orders
- `order_id` must match your system's order ID
- Order can be pushed only ONCE
- Keep `reference_id` for tracking
- Always validate pincode before pushing

---

### 4. Assign Courier

**Purpose:** Assign selected courier to an order

**Endpoint:** `POST /assign-courier`

**When to Use:**
- After push-order succeeds
- After selecting best courier from rate-calculator
- Before scheduling pickup

**Request:**
```typescript
{
  "order_id": "ORD123456",                       // string: YOUR order ID (from push-order)
  "courier_id": 1                                // number: courier_id from rate-calculator
}
```

**Response:**
```typescript
{
  "result": "1",
  "message": "Success",
  "data": {
    "order_id": "ORD123456",
    "reference_id": "ORD123456",
    "courier": "Delhivery"                       // string: Assigned courier name
  }
}
```

**Implementation Notes:**
- Call immediately after push-order
- `courier_id` must be from rate-calculator response
- If fails, try with different courier_id
- Response doesn't include AWB yet (comes from schedule-pickup)

---

### 5. Schedule Pickup

**Purpose:** Schedule courier pickup for orders (if not automatic)

**Endpoint:** `POST /schedule-pickup`

**When to Use:**
- Only if `pickups_automatically_scheduled = "NO"` from rate-calculator
- After assign-courier succeeds
- To get AWB (tracking) number

**Request:**
```typescript
{
  "order_id": "ORD123456"                        // string: YOUR order ID
}
```

**Response:**
```typescript
{
  "result": "1",
  "message": "Success",
  "data": {
    "order_id": "ORD123456",
    "reference_id": "ORD123456",
    "courier": "Delhivery",
    "awb_number": "1234567890123",               // string: TRACKING NUMBER (AWB)
    "lr_number": "58930303"                      // string: LR number
  }
}
```

**Critical Fields:**
- `awb_number`: This is the TRACKING NUMBER - store it in database
- `lr_number`: Lorry Receipt number - optional to store

**Implementation Notes:**
- Skip this API if pickups are automatic
- AWB number is essential for tracking
- Save AWB immediately to database
- Use AWB for all future tracking calls

---

### 6. Track Order

**Purpose:** Get current status and tracking details of shipment

**Endpoint:** `GET /track-order?awb_number={awb}`

**When to Use:**
- To show tracking status to user
- Background polling (every 30 mins for active orders)
- When user clicks "Track Order"

**Request:**
```
GET /track-order?awb_number=1234567890123
```

**Response:**
```typescript
{
  "result": "1",
  "message": "Success",
  "data": {
    "order_id": "ORD123456",
    "reference_id": "ORD123456",
    "awb_number": "1234567890123",
    "courier": "Delhivery Surface",
    "expected_delivery_date": "2024-12-30",      // string | null: Expected delivery
    "current_status": "In Transit",              // string: Current status
    "status_time": "2024-12-27 14:30:00",        // string | null: Last update time
    "scan_detail": [                             // array: Tracking timeline
      {
        "status": "Picked Up",
        "location": "Gurgaon Hub",
        "timestamp": "2024-12-27 10:00:00",
        "remarks": "Package picked from seller"
      },
      {
        "status": "In Transit",
        "location": "Delhi Hub",
        "timestamp": "2024-12-27 14:30:00",
        "remarks": "In transit to destination"
      }
      // ... more events
    ]
  }
}
```

**Status Values (Examples):**
- "Pickup Pending"
- "Picked Up"
- "In Transit"
- "Out for Delivery"
- "Delivered"
- "Cancelled"
- "RTO" (Return to Origin)

**Implementation Notes:**
- Poll active orders every 30 minutes
- Stop polling when status = Delivered/Cancelled/RTO
- Display scan_detail as timeline to user
- Cache tracking data for 5 minutes

---

### 7. Cancel Order

**Purpose:** Cancel an order before delivery

**Endpoint:** `POST /cancel-order`

**When to Use:**
- User requests order cancellation
- Order needs to be cancelled before pickup
- System-initiated cancellation

**Request:**
```typescript
{
  "order_id": "ORD123456",                       // string: YOUR order ID
  "awb_number": 1234567890123                    // number: AWB from schedule-pickup
}
```

**Response:**
```typescript
{
  "result": "1",
  "message": "Success",
  "data": {
    "order_id": "ORD123456",
    "reference_id": "ORD123456"
  }
}
```

**Implementation Notes:**
- Can only cancel before delivery
- Some couriers charge cancellation fee
- Update order status in your database immediately
- Notify user of cancellation

---

### 8. Get Warehouses

**Purpose:** Retrieve list of configured warehouses

**Endpoint:** `GET /get-warehouses`

**When to Use:**
- During system initialization
- When selecting pickup warehouse for order
- Cache and refresh daily

**Request:**
```
GET /get-warehouses
```

**Response:**
```typescript
{
  "result": "1",
  "message": "Success",
  "data": [
    {
      "id": 23481,                               // number: Warehouse ID
      "default": "YES",                          // string: "YES" | "NO"
      "address_title": "Main Warehouse",         // string: Warehouse name
      "name": "Manager Name",
      "email": "warehouse@example.com",
      "phone": "9001234567",
      "alt_phone": "9007654321",
      "address_line_one": "Plot 123, Sector 12",
      "address_line_two": "Industrial Area",
      "pincode": "122018",                       // string: Warehouse pincode
      "city": "Gurgaon",
      "state": "Haryana",
      "country": "India",
      "status": "ACTIVE"                         // string: "ACTIVE" | "INACTIVE"
    }
    // ... more warehouses
  ]
}
```

**Implementation Notes:**
- Cache warehouse list in Redis/memory
- Use default warehouse if not specified
- Filter by status = "ACTIVE"
- Use warehouse pincode in rate-calculator

---

### 9. Create Warehouse (Optional)

**Purpose:** Create new warehouse via API

**Endpoint:** `POST /create-warehouse`

**When to Use:**
- Adding new warehouse programmatically
- Multi-warehouse setup automation

**Request:**
```typescript
{
  "address_title": "Rajasthan Warehouse",        // string: Unique warehouse name
  "name": "Warehouse Manager",                   // string (optional): Manager name
  "phone": 9876543210,                           // number (optional): Phone
  "alternate_phone": 9876543211,                 // number (optional): Alt phone
  "email": "warehouse@example.com",              // string (optional): Email
  "address_line_one": "Plot 45, RIICO Area",     // string: Primary address
  "address_line_two": "Near Highway",            // string (optional): Secondary address
  "pin_code": 302001                             // number: Warehouse pincode
}
```

**Response:**
```typescript
{
  "result": "1",
  "message": "Success",
  "data": {
    "warehouse_id": "warehouse_xyz123"           // string: New warehouse ID
  }
}
```

**Important:**
- `address_title` must be UNIQUE
- If title exists, returns existing warehouse_id
- Better to create warehouses via Shipmozo panel
- Use get-warehouses to retrieve existing ones

---

## API Workflow

### Complete Order Fulfillment Flow

```
1. User enters delivery address
   ↓
2. Call: /pincode-serviceability
   ↓
3. If serviceable, call: /rate-calculator
   ↓
4. Display delivery options to user
   ↓
5. User confirms order
   ↓
6. Call: /push-order
   ↓
7. Select best courier from rate-calculator results
   ↓
8. Call: /assign-courier
   ↓
9. If pickups_automatically_scheduled = "NO":
   Call: /schedule-pickup
   ↓
10. Save AWB number to database
   ↓
11. Start tracking via /track-order (polling)
```

### Tracking Flow

```
Background Job (runs every 30 minutes):
1. Fetch active shipments from database
   ↓
2. For each shipment:
   - Call: /track-order?awb_number={awb}
   - Update database with latest status
   - If status = Delivered/Cancelled/RTO:
     Mark shipment as inactive
```

---

## Error Handling

### Standard Error Response

```typescript
{
  "result": "0",                                 // "0" indicates error
  "message": "Error description",                // Human-readable error
  "data": null | { "error": "Detailed error" }
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Order already exists" | Duplicate order_id | Use unique order IDs |
| "Invalid pincode" | Pincode not serviceable | Check serviceability first |
| "Courier not available" | courier_id invalid | Use valid ID from rate-calculator |
| "Order not found" | Invalid order_id | Verify order was pushed |
| "Invalid credentials" | Wrong API keys | Check public/private keys |
| CORS error | Trailing slash in URL | Remove trailing / from URLs |

### Error Handling Strategy

```typescript
async function handleShipmozoAPI(apiCall: () => Promise<any>) {
  try {
    const response = await apiCall();
    const data = await response.json();
    
    if (data.result === "0") {
      throw new Error(data.message);
    }
    
    return data;
  } catch (error) {
    logger.error('Shipmozo API Error:', error);
    
    // Implement retry logic for transient errors
    if (error.message.includes('network') || error.message.includes('timeout')) {
      // Retry with exponential backoff
      return retryWithBackoff(apiCall, 3);
    }
    
    throw error;
  }
}
```

---

## Best Practices

### 1. Rate Limiting & Caching

```typescript
// Cache pincode serviceability for 24 hours
const cacheKey = `serviceability:${pickupPin}:${deliveryPin}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const result = await checkServiceability(pickupPin, deliveryPin);
await redis.setex(cacheKey, 86400, JSON.stringify(result)); // 24h cache
```

### 2. Idempotency

```typescript
// Ensure push-order is called only once
const existingShipment = await db.findShipment({ orderId });
if (existingShipment?.shipmozoOrderId) {
  return existingShipment; // Already pushed
}

// Push order
const result = await pushOrder(orderData);
await db.saveShipment({ orderId, shipmozoOrderId: result.data.order_id });
```

### 3. Async Processing

```typescript
// Use queue for order processing
await orderQueue.add('create-shipment', {
  orderId: 'ORD123',
  // ... order data
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }
});
```

### 4. Data Validation

```typescript
// Validate before API call
function validateOrderData(data: any) {
  if (!data.order_id || data.order_id.length > 50) {
    throw new Error('Invalid order_id');
  }
  
  if (!/^\d{6}$/.test(data.consignee_pin_code.toString())) {
    throw new Error('Invalid pincode format');
  }
  
  if (data.weight <= 0 || data.weight > 50000) {
    throw new Error('Weight must be between 1-50000 grams');
  }
  
  // ... more validations
}
```

### 5. Logging & Monitoring

```typescript
logger.info('Shipmozo API Call', {
  endpoint: '/push-order',
  orderId: 'ORD123',
  timestamp: new Date().toISOString()
});

// Log responses
logger.info('Shipmozo API Response', {
  endpoint: '/push-order',
  orderId: 'ORD123',
  result: data.result,
  awbNumber: data.data.awb_number
});

// Alert on failures
if (data.result === "0") {
  alerting.sendAlert({
    level: 'error',
    message: `Shipmozo order creation failed: ${data.message}`,
    orderId: 'ORD123'
  });
}
```

### 6. Webhook Alternative (Polling Strategy)

```typescript
// Since Shipmozo doesn't provide webhooks, implement smart polling
class TrackingPoller {
  async pollShipment(awbNumber: string, status: string) {
    // Adjust polling frequency based on status
    const intervals = {
      'PENDING': 60 * 60 * 1000,        // 1 hour
      'IN_TRANSIT': 30 * 60 * 1000,     // 30 minutes
      'OUT_FOR_DELIVERY': 10 * 60 * 1000 // 10 minutes
    };
    
    const interval = intervals[status] || 30 * 60 * 1000;
    
    setTimeout(() => this.trackAndUpdate(awbNumber), interval);
  }
}
```

---

## API Limits & Constraints

| Parameter | Limit | Notes |
|-----------|-------|-------|
| order_id length | 50 chars | Keep concise |
| Weight | 1g - 50kg | Per package |
| Dimensions | Max 100cm per side | Length/width/height |
| Product name | 100 chars | Truncate if needed |
| Request timeout | 30 seconds | Implement retry |
| Rate limit | Not specified | Use exponential backoff |

---

## Quick Reference

### Minimal Order Creation

```typescript
// 1. Check serviceability
const serviceable = await POST('/pincode-serviceability', {
  pickup_pincode: 122001,
  delivery_pincode: 110001
});

// 2. Get rates
const rates = await POST('/rate-calculator', { /* params */ });

// 3. Push order
const order = await POST('/push-order', { /* order details */ });

// 4. Assign courier
const assignment = await POST('/assign-courier', {
  order_id: 'ORD123',
  courier_id: rates.data[0].courier_id
});

// 5. Schedule pickup (if needed)
const pickup = await POST('/schedule-pickup', { order_id: 'ORD123' });

// 6. Track
const tracking = await GET(`/track-order?awb_number=${pickup.data.awb_number}`);
```

---

## Conclusion

This integration guide covers all essential Shipmozo endpoints needed for:
- ✅ Checking delivery availability
- ✅ Getting courier rates
- ✅ Creating shipments
- ✅ Tracking orders
- ✅ Managing warehouses

**Next Steps:**
1. Implement base adapter following the architecture document
2. Add proper error handling and retries
3. Set up tracking poller for active shipments
4. Configure monitoring and alerts

For multi-carrier integration, refer to the Architecture Documentation.