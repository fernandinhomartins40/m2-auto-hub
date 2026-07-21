-- CreateEnum
CREATE TYPE "RelationshipMessageStatus" AS ENUM ('PENDING', 'SENT');

-- CreateEnum
CREATE TYPE "RelationshipMessageOutcome" AS ENUM ('PENDING', 'REPLIED', 'SCHEDULED', 'PURCHASED', 'NO_REPLY');

-- CreateTable
CREATE TABLE "relationship_messages" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "categoryId" TEXT,
    "templateId" TEXT,
    "adminId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "templateName" TEXT,
    "messageBody" TEXT NOT NULL,
    "status" "RelationshipMessageStatus" NOT NULL DEFAULT 'PENDING',
    "outcome" "RelationshipMessageOutcome" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relationship_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "relationship_messages_status_createdAt_idx" ON "relationship_messages"("status", "createdAt");

-- CreateIndex
CREATE INDEX "relationship_messages_categoryKey_createdAt_idx" ON "relationship_messages"("categoryKey", "createdAt");

-- CreateIndex
CREATE INDEX "relationship_messages_customerId_createdAt_idx" ON "relationship_messages"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "relationship_messages_createdAt_idx" ON "relationship_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "relationship_messages" ADD CONSTRAINT "relationship_messages_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_messages" ADD CONSTRAINT "relationship_messages_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "relationship_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_messages" ADD CONSTRAINT "relationship_messages_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "relationship_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relationship_messages" ADD CONSTRAINT "relationship_messages_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
