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
CREATE TABLE "product_cart_images" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "product_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "device_type" "image_device_type" NOT NULL,
    "alt_text" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_cart_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_cart_images_product_id_idx" ON "product_cart_images"("product_id");

-- CreateIndex
CREATE INDEX "product_cart_images_device_type_idx" ON "product_cart_images"("product_id", "device_type");

-- AddForeignKey
ALTER TABLE "product_cart_images" ADD CONSTRAINT "product_cart_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
