-- CreateEnum
CREATE TYPE "LoyaltyRewardType" AS ENUM ('DISCOUNT', 'PRODUCT', 'SERVICE', 'GIFT');

-- CreateEnum
CREATE TYPE "LoyaltyRewardStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM (
  'EARN_ORDER',
  'EARN_REVISION',
  'EARN_SIGNUP',
  'EARN_BIRTHDAY',
  'EARN_MANUAL',
  'ADJUST_MANUAL',
  'REDEEM_REWARD',
  'EXPIRE_POINTS'
);

-- CreateEnum
CREATE TYPE "LoyaltyRedemptionStatus" AS ENUM ('AVAILABLE', 'USED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "settings"
ADD COLUMN "loyaltyProgramName" TEXT NOT NULL DEFAULT 'Clube Fidelidade M2',
ADD COLUMN "loyaltyProgramDescription" TEXT NOT NULL DEFAULT 'Acumule pontos em compras e revisoes para trocar por vantagens.',
ADD COLUMN "loyaltyProgramActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "loyaltyPointsPerReal" DECIMAL(10,2) NOT NULL DEFAULT 1,
ADD COLUMN "loyaltyMinPurchaseForPoints" DECIMAL(10,2) NOT NULL DEFAULT 50,
ADD COLUMN "loyaltyRevisionBonusPoints" INTEGER NOT NULL DEFAULT 25,
ADD COLUMN "loyaltySignupBonusPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "loyaltyBirthdayBonusPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "loyaltyPointsValidityDays" INTEGER,
ADD COLUMN "loyaltyTierMultipliers" JSONB NOT NULL DEFAULT '{"BRONZE":1,"SILVER":1.1,"GOLD":1.25,"PLATINUM":1.5}',
ADD COLUMN "loyaltyTermsAndConditions" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "loyalty_rewards" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" "LoyaltyRewardType" NOT NULL,
  "pointsCost" INTEGER NOT NULL,
  "discountValue" DECIMAL(10,2),
  "minLevel" "CustomerLevel" NOT NULL DEFAULT 'BRONZE',
  "status" "LoyaltyRewardStatus" NOT NULL DEFAULT 'ACTIVE',
  "usageInstructions" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "loyalty_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_redemptions" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "rewardId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "pointsSpent" INTEGER NOT NULL,
  "status" "LoyaltyRedemptionStatus" NOT NULL DEFAULT 'AVAILABLE',
  "notes" TEXT,
  "expiresAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "loyalty_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_transactions" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "rewardId" TEXT,
  "redemptionId" TEXT,
  "orderId" TEXT,
  "revisionId" TEXT,
  "type" "LoyaltyTransactionType" NOT NULL,
  "points" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "loyalty_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "loyalty_rewards_status_idx" ON "loyalty_rewards"("status");

-- CreateIndex
CREATE INDEX "loyalty_rewards_minLevel_idx" ON "loyalty_rewards"("minLevel");

-- CreateIndex
CREATE INDEX "loyalty_rewards_type_idx" ON "loyalty_rewards"("type");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_redemptions_code_key" ON "loyalty_redemptions"("code");

-- CreateIndex
CREATE INDEX "loyalty_redemptions_customerId_createdAt_idx" ON "loyalty_redemptions"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "loyalty_redemptions_rewardId_idx" ON "loyalty_redemptions"("rewardId");

-- CreateIndex
CREATE INDEX "loyalty_redemptions_status_idx" ON "loyalty_redemptions"("status");

-- CreateIndex
CREATE INDEX "loyalty_transactions_customerId_createdAt_idx" ON "loyalty_transactions"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "loyalty_transactions_rewardId_idx" ON "loyalty_transactions"("rewardId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_redemptionId_idx" ON "loyalty_transactions"("redemptionId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_orderId_idx" ON "loyalty_transactions"("orderId");

-- CreateIndex
CREATE INDEX "loyalty_transactions_revisionId_idx" ON "loyalty_transactions"("revisionId");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_transactions_orderId_type_key" ON "loyalty_transactions"("orderId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "loyalty_transactions_revisionId_type_key" ON "loyalty_transactions"("revisionId", "type");

-- AddForeignKey
ALTER TABLE "loyalty_redemptions"
ADD CONSTRAINT "loyalty_redemptions_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_redemptions"
ADD CONSTRAINT "loyalty_redemptions_rewardId_fkey"
FOREIGN KEY ("rewardId") REFERENCES "loyalty_rewards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions"
ADD CONSTRAINT "loyalty_transactions_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions"
ADD CONSTRAINT "loyalty_transactions_rewardId_fkey"
FOREIGN KEY ("rewardId") REFERENCES "loyalty_rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loyalty_transactions"
ADD CONSTRAINT "loyalty_transactions_redemptionId_fkey"
FOREIGN KEY ("redemptionId") REFERENCES "loyalty_redemptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
