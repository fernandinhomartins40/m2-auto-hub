-- AlterTable
ALTER TABLE "vehicle_plate_lookups" ADD COLUMN     "displacement" TEXT,
ADD COLUMN     "power" TEXT,
ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'api';
