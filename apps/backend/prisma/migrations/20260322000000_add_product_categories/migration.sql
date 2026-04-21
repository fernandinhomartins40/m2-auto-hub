-- Create managed product categories
CREATE TABLE "product_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");
CREATE INDEX "product_categories_name_idx" ON "product_categories"("name");

-- Backfill categories already in use by existing products
INSERT INTO "product_categories" ("id", "name")
SELECT
  md5(trimmed."category" || random()::text || clock_timestamp()::text),
  trimmed."category"
FROM (
  SELECT DISTINCT trim("category") AS "category"
  FROM "products"
  WHERE "category" IS NOT NULL
    AND trim("category") <> ''
) AS trimmed
ON CONFLICT ("name") DO NOTHING;
