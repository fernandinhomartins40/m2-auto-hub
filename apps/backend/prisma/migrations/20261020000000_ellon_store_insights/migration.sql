ALTER TYPE "LoyaltyTransactionType" ADD VALUE IF NOT EXISTS 'EARN_STORE_SALE';
ALTER TYPE "LoyaltyTransactionType" ADD VALUE IF NOT EXISTS 'REVERSE_STORE_SALE';

ALTER TABLE "loyalty_transactions" ADD COLUMN "externalRef" TEXT;
CREATE UNIQUE INDEX "loyalty_transactions_externalRef_type_key" ON "loyalty_transactions"("externalRef", "type");

ALTER TABLE "ellon_snapshots" ADD COLUMN "occurredAt" TIMESTAMP(3);
ALTER TABLE "ellon_snapshots" ADD COLUMN "amount" DECIMAL(12,2);
ALTER TABLE "ellon_snapshots" ADD COLUMN "customerExternalId" TEXT;
ALTER TABLE "ellon_snapshots" ADD COLUMN "cancelled" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "ellon_snapshots_type_occurredAt_idx" ON "ellon_snapshots"("type", "occurredAt");
CREATE INDEX "ellon_snapshots_type_customerExternalId_idx" ON "ellon_snapshots"("type", "customerExternalId");

ALTER TABLE "ellon_connections" ADD COLUMN "liveStockCheck" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ellon_connections" ADD COLUMN "loyaltyFromStoreSales" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ellon_connections" ADD COLUMN "loyaltyStoreSalesSince" TIMESTAMP(3);
