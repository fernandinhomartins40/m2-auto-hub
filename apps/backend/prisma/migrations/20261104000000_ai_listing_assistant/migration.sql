-- CreateEnum
CREATE TYPE "AiSuggestionStatus" AS ENUM ('QUEUED', 'RUNNING', 'READY', 'APPLIED', 'FAILED');

-- AlterTable
ALTER TABLE "marketplace_product_profiles" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "ai_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "apiKey" TEXT,
    "model" TEXT NOT NULL DEFAULT 'deepseek-flash',
    "monthlyBudgetBrl" DECIMAL(10,2) NOT NULL DEFAULT 50,
    "usdToBrl" DECIMAL(8,4) NOT NULL DEFAULT 5.5,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL,
    "costUsd" DECIMAL(12,6) NOT NULL,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_ai_suggestions" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "provider" "MarketplaceProvider" NOT NULL,
    "status" "AiSuggestionStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB,
    "error" TEXT,
    "costUsd" DECIMAL(12,6),
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_ai_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_createdAt_idx" ON "ai_usage"("createdAt");

-- CreateIndex
CREATE INDEX "marketplace_ai_suggestions_status_idx" ON "marketplace_ai_suggestions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_ai_suggestions_productId_provider_key" ON "marketplace_ai_suggestions"("productId", "provider");

-- AddForeignKey
ALTER TABLE "marketplace_ai_suggestions" ADD CONSTRAINT "marketplace_ai_suggestions_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

