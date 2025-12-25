-- CreateEnum
CREATE TYPE "coupon_discount_type" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "coupon_status" AS ENUM ('ACTIVE', 'INACTIVE', 'EXPIRED', 'EXHAUSTED');

-- AlterTable
ALTER TABLE "auth" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "auth_sessions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

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
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "discount_type" "coupon_discount_type" NOT NULL,
    "discount_value" DECIMAL(10,2) NOT NULL,
    "max_discount_amount" DECIMAL(10,2),
    "min_order_amount" DECIMAL(10,2),
    "max_total_uses" INTEGER,
    "max_uses_per_user" INTEGER NOT NULL DEFAULT 1,
    "current_use_count" INTEGER NOT NULL DEFAULT 0,
    "valid_from" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "is_first_order_only" BOOLEAN NOT NULL DEFAULT false,
    "applicable_products" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "applicable_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "coupon_status" NOT NULL DEFAULT 'ACTIVE',
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_by" VARCHAR(100),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_usages" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "coupon_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "order_amount" DECIMAL(10,2) NOT NULL,
    "used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_status_idx" ON "coupons"("status");

-- CreateIndex
CREATE INDEX "coupons_validity_idx" ON "coupons"("valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "coupons_first_order_idx" ON "coupons"("is_first_order_only");

-- CreateIndex
CREATE INDEX "coupon_usage_coupon_id_idx" ON "coupon_usages"("coupon_id");

-- CreateIndex
CREATE INDEX "coupon_usage_user_id_idx" ON "coupon_usages"("user_id");

-- CreateIndex
CREATE INDEX "coupon_usage_order_id_idx" ON "coupon_usages"("order_id");

-- CreateIndex
CREATE INDEX "coupon_usage_user_coupon_idx" ON "coupon_usages"("user_id", "coupon_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_usage_coupon_order_unique" ON "coupon_usages"("coupon_id", "order_id");

-- AddForeignKey
ALTER TABLE "coupon_usages" ADD CONSTRAINT "coupon_usages_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
