ALTER TYPE "EllonJobType" ADD VALUE IF NOT EXISTS 'SYNC_CUSTOMERS';
ALTER TYPE "EllonJobType" ADD VALUE IF NOT EXISTS 'SYNC_REFERENCE_DATA';

CREATE TABLE "ellon_snapshots" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT,
    "payload" JSONB NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ellon_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ellon_snapshots_type_externalId_key" ON "ellon_snapshots"("type", "externalId");
CREATE INDEX "ellon_snapshots_type_syncedAt_idx" ON "ellon_snapshots"("type", "syncedAt");

UPDATE "ellon_connections"
SET "syncProducts" = TRUE, "syncCustomers" = TRUE, "syncOrders" = TRUE
WHERE "enabled" = TRUE;

ALTER TABLE "ellon_connections" ALTER COLUMN "syncProducts" SET DEFAULT TRUE;
ALTER TABLE "ellon_connections" ALTER COLUMN "syncCustomers" SET DEFAULT TRUE;
ALTER TABLE "ellon_connections" ALTER COLUMN "syncOrders" SET DEFAULT TRUE;
