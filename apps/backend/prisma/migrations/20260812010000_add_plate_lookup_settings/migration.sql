-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "plateLookupEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "plateLookupProvider" TEXT NOT NULL DEFAULT 'apibrasil',
ADD COLUMN     "plateLookupBearerToken" TEXT,
ADD COLUMN     "plateLookupDeviceToken" TEXT;
