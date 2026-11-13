-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "appVersionPolicy" JSONB;
