-- CreateEnum
CREATE TYPE "carrier_type" AS ENUM ('SHIPMOZO', 'DELHIVERY', 'DTDC', 'PUSHPAK');

-- CreateEnum
CREATE TYPE "shipment_status" AS ENUM ('PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'FAILED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "auth" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "auth_sessions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "coupon_usages" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "coupons" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "item_reviews" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "order_reviews" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "order_status_history" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "product_cart_images" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "product_images" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "product_variants" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "reviews" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "order_id" TEXT NOT NULL,
    "carrier_type" "carrier_type" NOT NULL,
    "carrier_name" VARCHAR(100) NOT NULL,
    "tracking_number" VARCHAR(100) NOT NULL,
    "current_status" "shipment_status" NOT NULL DEFAULT 'PENDING',
    "estimated_delivery_days" VARCHAR(50),
    "shipping_cost" DECIMAL(10,2) NOT NULL,
    "metadata" JSONB,
    "label_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_tracked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_tracking_events" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "shipment_id" TEXT NOT NULL,
    "status" VARCHAR(100) NOT NULL,
    "status_code" "shipment_status" NOT NULL,
    "location" VARCHAR(255),
    "remarks" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_tracking_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_order_id_idx" ON "shipments"("order_id");

-- CreateIndex
CREATE INDEX "shipments_tracking_number_idx" ON "shipments"("tracking_number");

-- CreateIndex
CREATE INDEX "shipments_status_idx" ON "shipments"("current_status");

-- CreateIndex
CREATE INDEX "shipments_active_idx" ON "shipments"("is_active");

-- CreateIndex
CREATE INDEX "shipments_created_at_idx" ON "shipments"("created_at");

-- CreateIndex
CREATE INDEX "shipments_carrier_type_idx" ON "shipments"("carrier_type");

-- CreateIndex
CREATE INDEX "shipment_tracking_events_shipment_id_idx" ON "shipment_tracking_events"("shipment_id");

-- CreateIndex
CREATE INDEX "shipment_tracking_events_timestamp_idx" ON "shipment_tracking_events"("timestamp");

-- CreateIndex
CREATE INDEX "shipment_tracking_events_shipment_timestamp_idx" ON "shipment_tracking_events"("shipment_id", "timestamp" DESC);

-- AddForeignKey
ALTER TABLE "shipment_tracking_events" ADD CONSTRAINT "shipment_tracking_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
