-- ============================================
-- ORDERS SYSTEM MIGRATION
-- ============================================
-- This SQL migration creates the orders system tables
-- Run after ensuring your database connection is active

-- Create Enums
CREATE TYPE order_status AS ENUM (
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
  'FAILED'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
);

CREATE TYPE payment_method AS ENUM (
  'CREDIT_CARD',
  'DEBIT_CARD',
  'UPI',
  'NET_BANKING',
  'WALLET',
  'COD',
  'EMI'
);

CREATE TYPE delivery_type AS ENUM (
  'STANDARD',
  'EXPRESS',
  'SAME_DAY'
);

-- ============================================
-- ORDERS TABLE
-- ============================================
CREATE TABLE orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  -- Order Identification
  order_number VARCHAR(50) UNIQUE NOT NULL,

  -- User Information
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

  -- Order Status
  status order_status NOT NULL DEFAULT 'PENDING',

  -- Pricing Details
  subtotal DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  coupon_discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  coupon_code VARCHAR(50),
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL,

  -- Delivery Information
  delivery_type delivery_type NOT NULL DEFAULT 'STANDARD',
  shipping_address_line1 VARCHAR(255) NOT NULL,
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100) NOT NULL,
  shipping_state VARCHAR(100) NOT NULL,
  shipping_postal_code VARCHAR(20) NOT NULL,
  shipping_country VARCHAR(100) NOT NULL DEFAULT 'India',

  -- Contact Information
  customer_name VARCHAR(200) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,

  -- Courier/Shipping Tracking
  external_order_id VARCHAR(100) UNIQUE,  -- Courier partner's order ID
  tracking_number VARCHAR(100) UNIQUE,
  courier_name VARCHAR(100),              -- e.g., "Delhivery", "Blue Dart", "FedEx"
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  estimated_delivery TIMESTAMP,

  -- Order Lifecycle Timestamps
  confirmed_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Cancellation Details
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50),              -- "CUSTOMER", "ADMIN", "SYSTEM"

  -- Special Instructions
  order_notes TEXT,
  delivery_notes TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Indexes for Orders
CREATE INDEX orders_user_id_idx ON orders(user_id);
CREATE INDEX orders_status_idx ON orders(status);
CREATE INDEX orders_order_number_idx ON orders(order_number);
CREATE INDEX orders_external_order_id_idx ON orders(external_order_id);
CREATE INDEX orders_tracking_number_idx ON orders(tracking_number);
CREATE INDEX orders_created_at_idx ON orders(created_at DESC);
CREATE INDEX orders_user_status_idx ON orders(user_id, status);
CREATE INDEX orders_user_created_at_idx ON orders(user_id, created_at DESC);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================
CREATE TABLE order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Product Information
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,

  -- Snapshot of product details at time of order
  product_name VARCHAR(255) NOT NULL,
  product_slug VARCHAR(255) NOT NULL,
  variant_sku VARCHAR(100) NOT NULL,
  variant_weight INTEGER NOT NULL,
  variant_weight_unit VARCHAR(10) NOT NULL,

  -- Pricing snapshot at time of order
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,       -- Selling price per unit
  unit_mrp DECIMAL(10, 2) NOT NULL,         -- MRP per unit
  discount_per_unit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_price DECIMAL(10, 2) NOT NULL,      -- quantity * unitPrice

  -- Product image snapshot
  product_image_url TEXT,

  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Indexes for Order Items
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
CREATE INDEX order_items_product_id_idx ON order_items(product_id);
CREATE INDEX order_items_variant_id_idx ON order_items(variant_id);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Payment Details
  payment_method payment_method NOT NULL,
  payment_status payment_status NOT NULL DEFAULT 'PENDING',
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',

  -- Payment Gateway Information
  payment_gateway VARCHAR(50),              -- e.g., "Razorpay", "Stripe", "PayPal"
  gateway_order_id VARCHAR(100) UNIQUE,
  gateway_payment_id VARCHAR(100) UNIQUE,
  gateway_signature TEXT,

  -- Transaction Details
  transaction_id VARCHAR(100) UNIQUE,
  transaction_date TIMESTAMP,

  -- Refund Information
  refund_amount DECIMAL(10, 2) DEFAULT 0.00,
  refunded_at TIMESTAMP,
  refund_reason TEXT,
  refund_reference VARCHAR(100),

  -- Failure Information
  failure_reason TEXT,
  failure_code VARCHAR(50),

  -- Additional Details
  payment_metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Indexes for Payments
CREATE INDEX payments_order_id_idx ON payments(order_id);
CREATE INDEX payments_status_idx ON payments(payment_status);
CREATE INDEX payments_gateway_order_id_idx ON payments(gateway_order_id);
CREATE INDEX payments_gateway_payment_id_idx ON payments(gateway_payment_id);
CREATE INDEX payments_transaction_id_idx ON payments(transaction_id);

-- ============================================
-- ORDER STATUS HISTORY TABLE
-- ============================================
CREATE TABLE order_status_history (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Status Change Details
  from_status order_status,
  to_status order_status NOT NULL,

  -- Change Context
  changed_by VARCHAR(50),                   -- "SYSTEM", "ADMIN", "CUSTOMER", "COURIER"
  reason TEXT,
  notes TEXT,

  -- Metadata
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create Indexes for Order Status History
CREATE INDEX order_status_history_order_id_idx ON order_status_history(order_id);
CREATE INDEX order_status_history_order_created_idx ON order_status_history(order_id, created_at DESC);

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp on orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Trigger to update updated_at timestamp on payments
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payments_updated_at_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert a sample order
-- IMPORTANT: Replace the user_id, product_id, and variant_id with actual IDs from your database
/*
INSERT INTO orders (
  order_number, user_id, status, subtotal, total_amount,
  shipping_address_line1, shipping_city, shipping_state, shipping_postal_code,
  customer_name, customer_email, customer_phone
) VALUES (
  'ORD-2024-000001',
  'your-user-id-here',
  'PENDING',
  499.00,
  499.00,
  '123 Main Street',
  'Mumbai',
  'Maharashtra',
  '400001',
  'John Doe',
  'john@example.com',
  '+919876543210'
);
*/

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE orders IS 'Main orders table storing customer orders';
COMMENT ON COLUMN orders.external_order_id IS 'Courier/Logistics partner order ID for tracking';
COMMENT ON COLUMN orders.tracking_number IS 'Shipment tracking number provided by courier';
COMMENT ON COLUMN orders.courier_name IS 'Name of courier service (e.g., Delhivery, Blue Dart)';

COMMENT ON TABLE order_items IS 'Individual items within an order with snapshot of product details';
COMMENT ON TABLE payments IS 'Payment transactions linked to orders';
COMMENT ON TABLE order_status_history IS 'Audit trail of all status changes for orders';
