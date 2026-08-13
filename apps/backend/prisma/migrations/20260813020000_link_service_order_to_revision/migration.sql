-- AlterTable
ALTER TABLE "service_orders" ADD COLUMN     "revisionId" TEXT;

-- CreateIndex
CREATE INDEX "service_orders_revisionId_idx" ON "service_orders"("revisionId");

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "revisions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
