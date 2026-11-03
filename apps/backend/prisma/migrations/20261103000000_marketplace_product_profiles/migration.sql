warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

-- CreateEnum
CREATE TYPE "MarketplaceStockMode" AS ENUM ('STORE_ONLY', 'STORE_PLUS_SUPPLIER', 'MADE_TO_ORDER');

-- AlterTable
ALTER TABLE "marketplace_connections" ADD COLUMN     "settings" JSONB;

-- AlterTable
ALTER TABLE "marketplace_listings" ADD COLUMN     "pausedBySystem" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "marketplace_product_profiles" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "provider" "MarketplaceProvider" NOT NULL,
    "title" TEXT,
    "brand" TEXT,
    "partNumber" TEXT,
    "categoryId" TEXT,
    "categoryName" TEXT,
    "attributes" JSONB,
    "packageWeightG" INTEGER,
    "packageHeightCm" DOUBLE PRECISION,
    "packageWidthCm" DOUBLE PRECISION,
    "packageLengthCm" DOUBLE PRECISION,
    "stockMode" "MarketplaceStockMode" NOT NULL DEFAULT 'STORE_ONLY',
    "supplierQuantity" INTEGER NOT NULL DEFAULT 0,
    "manufacturingDays" INTEGER NOT NULL DEFAULT 0,
    "markupPercent" DECIMAL(6,2),
    "fixedPrice" DECIMAL(10,2),
    "listingTypeId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_product_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketplace_product_profiles_provider_idx" ON "marketplace_product_profiles"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_product_profiles_productId_provider_key" ON "marketplace_product_profiles"("productId", "provider");

-- AddForeignKey
ALTER TABLE "marketplace_product_profiles" ADD CONSTRAINT "marketplace_product_profiles_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
┌─────────────────────────────────────────────────────────┐
│  Update available 6.19.3 -> 8.0.0-rc.30                 │
│                                                         │
│  This is a major update - please follow the guide at    │
│  https://pris.ly/d/major-version-upgrade                │
│                                                         │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

