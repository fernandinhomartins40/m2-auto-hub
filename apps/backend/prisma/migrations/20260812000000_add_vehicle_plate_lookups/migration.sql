-- CreateTable
CREATE TABLE "vehicle_plate_lookups" (
    "id" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "color" TEXT,
    "chassisNumber" TEXT,
    "fuel" TEXT,
    "city" TEXT,
    "state" TEXT,
    "rawResponse" JSONB,
    "provider" TEXT NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "lastAccessAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_plate_lookups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_plate_lookups_plate_key" ON "vehicle_plate_lookups"("plate");

-- CreateIndex
CREATE INDEX "vehicle_plate_lookups_plate_idx" ON "vehicle_plate_lookups"("plate");
