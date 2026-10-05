CREATE TYPE "EllonConnectionStatus" AS ENUM ('DISABLED', 'PENDING', 'CONNECTED', 'ERROR');
CREATE TYPE "EllonEntityType" AS ENUM ('PRODUCT', 'SERVICE', 'CUSTOMER', 'ORDER', 'SERVICE_ORDER');
CREATE TYPE "EllonJobType" AS ENUM ('EXPORT_CUSTOMER', 'EXPORT_ORDER', 'EXPORT_SERVICE_ORDER', 'SYNC_PRODUCTS', 'SYNC_ORDER_STATUS');
CREATE TYPE "EllonJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

CREATE TABLE "ellon_connections" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "status" "EllonConnectionStatus" NOT NULL DEFAULT 'DISABLED',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "baseUrl" TEXT NOT NULL DEFAULT 'http://fvendas.ellon.inf.br:9047',
  "companyCode" INTEGER,
  "transactionCode" INTEGER,
  "costCenterCode" INTEGER,
  "sellerCode" INTEGER,
  "warehouseCode" INTEGER,
  "paymentMethodCode" INTEGER,
  "carrierCode" INTEGER,
  "integrationCodeEncrypted" TEXT,
  "passwordEncrypted" TEXT,
  "accessHashEncrypted" TEXT,
  "bearerTokenEncrypted" TEXT,
  "bearerTokenExpiresAt" TIMESTAMP(3),
  "syncProducts" BOOLEAN NOT NULL DEFAULT false,
  "syncCustomers" BOOLEAN NOT NULL DEFAULT false,
  "syncOrders" BOOLEAN NOT NULL DEFAULT false,
  "lastConnectionAt" TIMESTAMP(3),
  "lastProductSyncAt" TIMESTAMP(3),
  "lastOrderSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ellon_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ellon_entity_links" (
  "id" TEXT NOT NULL,
  "entityType" "EllonEntityType" NOT NULL,
  "localId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "externalSequence" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ellon_entity_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ellon_jobs" (
  "id" TEXT NOT NULL,
  "type" "EllonJobType" NOT NULL,
  "status" "EllonJobStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "localEntityId" TEXT,
  "payload" JSONB NOT NULL,
  "response" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 8,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "processedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ellon_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ellon_entity_links_entityType_localId_key" ON "ellon_entity_links"("entityType", "localId");
CREATE INDEX "ellon_entity_links_entityType_externalId_idx" ON "ellon_entity_links"("entityType", "externalId");
CREATE UNIQUE INDEX "ellon_jobs_idempotencyKey_key" ON "ellon_jobs"("idempotencyKey");
CREATE INDEX "ellon_jobs_status_nextAttemptAt_idx" ON "ellon_jobs"("status", "nextAttemptAt");
CREATE INDEX "ellon_jobs_type_localEntityId_idx" ON "ellon_jobs"("type", "localEntityId");
