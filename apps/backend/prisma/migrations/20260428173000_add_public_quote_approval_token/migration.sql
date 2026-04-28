-- AlterTable
ALTER TABLE "orders"
ADD COLUMN "publicQuoteApprovalToken" TEXT,
ADD COLUMN "publicQuoteApprovalExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "orders_publicQuoteApprovalToken_key" ON "orders"("publicQuoteApprovalToken");

-- CreateIndex
CREATE INDEX "orders_publicQuoteApprovalToken_idx" ON "orders"("publicQuoteApprovalToken");
