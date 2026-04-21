-- Create managed service categories
CREATE TABLE "service_categories" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_categories_name_key" ON "service_categories"("name");
CREATE INDEX "service_categories_name_idx" ON "service_categories"("name");

-- Backfill categories already in use by existing services
INSERT INTO "service_categories" ("id", "name")
SELECT
  md5(trimmed."category" || random()::text || clock_timestamp()::text),
  trimmed."category"
FROM (
  SELECT DISTINCT trim("category") AS "category"
  FROM "services"
  WHERE "category" IS NOT NULL
    AND trim("category") <> ''
) AS trimmed
ON CONFLICT ("name") DO NOTHING;
