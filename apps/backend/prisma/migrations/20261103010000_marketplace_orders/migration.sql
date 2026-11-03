-- CreateEnum
CREATE TYPE "MarketplaceFulfillmentStage" AS ENUM ('AWAITING_PAYMENT', 'AWAITING_SUPPLIER', 'TO_PICK', 'READY_TO_SHIP', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "marketplace_orders" (
    "id" TEXT NOT NULL,
    "provider" "MarketplaceProvider" NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "packId" TEXT,
    "orderId" TEXT,
    "status" TEXT NOT NULL,
    "stage" "MarketplaceFulfillmentStage" NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "buyerNickname" TEXT,
    "total" DECIMAL(10,2) NOT NULL,
    "items" JSONB NOT NULL,
    "shipmentId" TEXT,
    "shipmentStatus" TEXT,
    "shipmentSubstatus" TEXT,
    "logisticType" TEXT,
    "trackingNumber" TEXT,
    "dispatchBy" TIMESTAMP(3),
    "supplierReceivedAt" TIMESTAMP(3),
    "pickedAt" TIMESTAMP(3),
    "labelPrintedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "slaAlertedAt" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_orders_orderId_key" ON "marketplace_orders"("orderId");

-- CreateIndex
CREATE INDEX "marketplace_orders_stage_idx" ON "marketplace_orders"("stage");

-- CreateIndex
CREATE INDEX "marketplace_orders_shipmentId_idx" ON "marketplace_orders"("shipmentId");

-- CreateIndex
CREATE INDEX "marketplace_orders_dispatchBy_idx" ON "marketplace_orders"("dispatchBy");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_orders_provider_externalOrderId_key" ON "marketplace_orders"("provider", "externalOrderId");

