-- CreateEnum
CREATE TYPE "RevisionCheckStatus" AS ENUM ('NOT_CHECKED', 'OK', 'ATTENTION', 'CRITICAL', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "revision_checks" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "itemId" TEXT,
    "categoryId" TEXT,
    "itemName" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "status" "RevisionCheckStatus" NOT NULL DEFAULT 'NOT_CHECKED',
    "notes" TEXT,
    "photos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revision_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "revision_checks_revisionId_idx" ON "revision_checks"("revisionId");
CREATE INDEX "revision_checks_itemId_idx" ON "revision_checks"("itemId");
CREATE INDEX "revision_checks_status_idx" ON "revision_checks"("status");

-- AlterTable
ALTER TABLE "service_order_items" ADD COLUMN     "revisionCheckId" TEXT;

-- CreateIndex
CREATE INDEX "service_order_items_revisionCheckId_idx" ON "service_order_items"("revisionCheckId");

-- AddForeignKey
ALTER TABLE "revision_checks" ADD CONSTRAINT "revision_checks_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revision_checks" ADD CONSTRAINT "revision_checks_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "checklist_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "revision_checks" ADD CONSTRAINT "revision_checks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "checklist_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "service_order_items" ADD CONSTRAINT "service_order_items_revisionCheckId_fkey" FOREIGN KEY ("revisionCheckId") REFERENCES "revision_checks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: as revisoes existentes so tem o JSON. Espelha o que ja esta la para
-- que relatorios enxerguem o historico inteiro, e nao apenas o que vier depois.
INSERT INTO "revision_checks" (
  "id", "revisionId", "itemId", "categoryId", "itemName", "categoryName",
  "status", "notes", "photos", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(),
  r."id",
  -- So referencia o catalogo quando o item ainda existe; senao guarda apenas o nome.
  (SELECT ci."id" FROM "checklist_items" ci WHERE ci."id" = (item->>'itemId')),
  (SELECT cc."id" FROM "checklist_categories" cc WHERE cc."id" = (item->>'categoryId')),
  COALESCE(NULLIF(item->>'itemName', ''), 'Item não identificado'),
  COALESCE(NULLIF(item->>'categoryName', ''), 'Sem categoria'),
  CASE item->>'status'
    WHEN 'OK' THEN 'OK'::"RevisionCheckStatus"
    WHEN 'ATTENTION' THEN 'ATTENTION'::"RevisionCheckStatus"
    WHEN 'CRITICAL' THEN 'CRITICAL'::"RevisionCheckStatus"
    WHEN 'NOT_APPLICABLE' THEN 'NOT_APPLICABLE'::"RevisionCheckStatus"
    ELSE 'NOT_CHECKED'::"RevisionCheckStatus"
  END,
  NULLIF(item->>'notes', ''),
  CASE WHEN jsonb_typeof(item->'photos') = 'array' THEN item->'photos' ELSE NULL END,
  r."createdAt",
  r."updatedAt"
FROM "revisions" r
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(r."checklistItems"::jsonb) = 'array'
       THEN r."checklistItems"::jsonb
       ELSE '[]'::jsonb END
) AS item
WHERE item->>'itemName' IS NOT NULL;
