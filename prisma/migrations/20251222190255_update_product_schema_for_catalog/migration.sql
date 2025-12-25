/*
  Warnings:

  - You are about to drop the column `thumbnail_url` on the `product_images` table. All the data in the column will be lost.
  - You are about to drop the column `coupon_applied_price` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `coupon_code` on the `product_variants` table. All the data in the column will be lost.
  - You are about to drop the column `average_rating` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `calories_per_100g` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `is_featured` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `long_description` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `nutritional_info` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `product_type` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `protein_per_100g` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `short_description` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `total_reviews` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `total_sales` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `usage_instructions` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `view_count` on the `products` table. All the data in the column will be lost.
  - Added the required column `device_type` to the `product_images` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "image_device_type" AS ENUM ('DESKTOP', 'MOBILE');

-- DropIndex
DROP INDEX "products_average_rating_idx";

-- DropIndex
DROP INDEX "products_is_featured_idx";

-- DropIndex
DROP INDEX "products_product_type_idx";

-- DropIndex
DROP INDEX "products_total_sales_idx";

-- AlterTable
ALTER TABLE "auth" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "auth_sessions" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "order_items" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "order_status_history" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "product_images" DROP COLUMN "thumbnail_url",
ADD COLUMN     "device_type" "image_device_type" NOT NULL,
ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "product_variants" DROP COLUMN "coupon_applied_price",
DROP COLUMN "coupon_code",
ADD COLUMN     "protein_quantity" DECIMAL(6,2),
ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "average_rating",
DROP COLUMN "calories_per_100g",
DROP COLUMN "features",
DROP COLUMN "is_featured",
DROP COLUMN "long_description",
DROP COLUMN "nutritional_info",
DROP COLUMN "product_type",
DROP COLUMN "protein_per_100g",
DROP COLUMN "short_description",
DROP COLUMN "total_reviews",
DROP COLUMN "total_sales",
DROP COLUMN "usage_instructions",
DROP COLUMN "view_count",
ADD COLUMN     "about_product" TEXT,
ADD COLUMN     "best_way_to_eat" TEXT,
ADD COLUMN     "best_way_to_eat_image_url" TEXT,
ADD COLUMN     "flavor" VARCHAR(100),
ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::TEXT;

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "reviewer_name" VARCHAR(150) NOT NULL,
    "reviewer_email" VARCHAR(255),
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "comment" TEXT NOT NULL,
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT false,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "unhelpful_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_product_id_idx" ON "reviews"("product_id");

-- CreateIndex
CREATE INDEX "reviews_variant_id_idx" ON "reviews"("variant_id");

-- CreateIndex
CREATE INDEX "reviews_product_approved_idx" ON "reviews"("product_id", "is_approved");

-- CreateIndex
CREATE INDEX "reviews_rating_idx" ON "reviews"("rating");

-- CreateIndex
CREATE INDEX "reviews_created_at_idx" ON "reviews"("created_at" DESC);

-- CreateIndex
CREATE INDEX "product_images_device_type_idx" ON "product_images"("product_id", "device_type");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
