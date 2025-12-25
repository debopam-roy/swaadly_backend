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
CREATE TABLE "order_reviews" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "overall_rating" INTEGER NOT NULL,
    "delivery_rating" INTEGER,
    "packaging_rating" INTEGER,
    "service_rating" INTEGER,
    "title" VARCHAR(255),
    "comment" TEXT,
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "moderation_notes" TEXT,
    "moderated_at" TIMESTAMP(3),
    "moderated_by" VARCHAR(100),
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "unhelpful_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_reviews" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "order_item_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "comment" TEXT,
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT true,
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "moderation_notes" TEXT,
    "moderated_at" TIMESTAMP(3),
    "moderated_by" VARCHAR(100),
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "unhelpful_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_reviews_order_id_key" ON "order_reviews"("order_id");

-- CreateIndex
CREATE INDEX "order_reviews_user_id_idx" ON "order_reviews"("user_id");

-- CreateIndex
CREATE INDEX "order_reviews_is_approved_idx" ON "order_reviews"("is_approved");

-- CreateIndex
CREATE INDEX "order_reviews_rating_idx" ON "order_reviews"("overall_rating");

-- CreateIndex
CREATE INDEX "order_reviews_created_at_idx" ON "order_reviews"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "item_reviews_order_item_id_key" ON "item_reviews"("order_item_id");

-- CreateIndex
CREATE INDEX "item_reviews_product_id_idx" ON "item_reviews"("product_id");

-- CreateIndex
CREATE INDEX "item_reviews_variant_id_idx" ON "item_reviews"("variant_id");

-- CreateIndex
CREATE INDEX "item_reviews_user_id_idx" ON "item_reviews"("user_id");

-- CreateIndex
CREATE INDEX "item_reviews_product_approved_idx" ON "item_reviews"("product_id", "is_approved");

-- CreateIndex
CREATE INDEX "item_reviews_rating_idx" ON "item_reviews"("rating");

-- CreateIndex
CREATE INDEX "item_reviews_created_at_idx" ON "item_reviews"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_reviews" ADD CONSTRAINT "order_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_reviews" ADD CONSTRAINT "item_reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_reviews" ADD CONSTRAINT "item_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_reviews" ADD CONSTRAINT "item_reviews_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_reviews" ADD CONSTRAINT "item_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
