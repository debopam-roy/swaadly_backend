-- AlterTable
-- Change average_rating from Decimal(3,2) to Decimal(2,1)
-- This changes rating precision from X.XX (e.g., 4.50) to X.X (e.g., 4.5)
ALTER TABLE "product_variants"
ALTER COLUMN "average_rating" TYPE DECIMAL(2,1),
ALTER COLUMN "average_rating" SET DEFAULT 0.0;
