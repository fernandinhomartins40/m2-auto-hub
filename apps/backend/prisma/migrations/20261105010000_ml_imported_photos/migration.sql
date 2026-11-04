-- AlterTable
ALTER TABLE "marketplace_product_profiles" ADD COLUMN     "importedPhotos" TEXT[] DEFAULT ARRAY[]::TEXT[];

