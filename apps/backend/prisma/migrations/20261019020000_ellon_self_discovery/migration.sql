ALTER TABLE "ellon_connections" ADD COLUMN "preOrderStatusMap" JSONB;
ALTER TABLE "ellon_connections" ADD COLUMN "observationLimit" INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE "ellon_connections" ADD COLUMN "customerUpdatesEnabled" BOOLEAN NOT NULL DEFAULT true;
