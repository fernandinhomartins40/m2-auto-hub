-- CreateEnum
CREATE TYPE "MarketplaceProvider" AS ENUM ('MERCADO_LIVRE', 'SHOPEE');

-- CreateEnum
CREATE TYPE "MarketplaceConnectionStatus" AS ENUM ('DISCONNECTED', 'PENDING', 'CONNECTED', 'TOKEN_EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "ListingSyncStatus" AS ENUM ('DRAFT', 'QUEUED', 'PUBLISHED', 'OUT_OF_SYNC', 'PAUSED', 'ERROR');

-- AlterEnum
ALTER TYPE "OrderSource" ADD VALUE 'MERCADO_LIVRE';
ALTER TYPE "OrderSource" ADD VALUE 'SHOPEE';

-- AlterTable
ALTER TABLE "orders"
ADD COLUMN "externalOrderId" TEXT,
ADD COLUMN "externalProvider" "MarketplaceProvider";

-- CreateTable
CREATE TABLE "marketplace_connections" (
    "id" TEXT NOT NULL,
    "provider" "MarketplaceProvider" NOT NULL,
    "status" "MarketplaceConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "appId" TEXT,
    "appSecret" TEXT,
    "sellerId" TEXT,
    "sellerNickname" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "scopes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" "MarketplaceProvider" NOT NULL,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "status" "ListingSyncStatus" NOT NULL DEFAULT 'DRAFT',
    "lastSyncedPrice" DECIMAL(10,2),
    "lastSyncedStock" INTEGER,
    "lastSyncedHash" TEXT,
    "lastError" TEXT,
    "categoryMapping" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_events" (
    "id" TEXT NOT NULL,
    "provider" "MarketplaceProvider" NOT NULL,
    "topic" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_externalOrderId_key" ON "orders"("externalOrderId");

-- CreateIndex
CREATE INDEX "orders_externalProvider_idx" ON "orders"("externalProvider");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_connections_provider_key" ON "marketplace_connections"("provider");

-- CreateIndex
CREATE INDEX "marketplace_listings_connectionId_idx" ON "marketplace_listings"("connectionId");

-- CreateIndex
CREATE INDEX "marketplace_listings_externalId_idx" ON "marketplace_listings"("externalId");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_idx" ON "marketplace_listings"("status");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_listings_productId_provider_key" ON "marketplace_listings"("productId", "provider");

-- CreateIndex
CREATE INDEX "marketplace_events_processed_idx" ON "marketplace_events"("processed");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_events_provider_topic_externalId_key" ON "marketplace_events"("provider", "topic", "externalId");

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "marketplace_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
