-- CreateTable
CREATE TABLE "relationship_categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT NOT NULL DEFAULT 'MessageCircle',
    "accentColor" TEXT NOT NULL DEFAULT '#f97316',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "sortBy" TEXT NOT NULL DEFAULT 'daysSinceLastInteraction',
    "sortDir" TEXT NOT NULL DEFAULT 'asc',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relationship_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relationship_templates" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relationship_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "relationship_categories_key_key" ON "relationship_categories"("key");

-- CreateIndex
CREATE INDEX "relationship_categories_isActive_sortOrder_idx" ON "relationship_categories"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "relationship_templates_categoryId_isActive_sortOrder_idx" ON "relationship_templates"("categoryId", "isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "relationship_templates" ADD CONSTRAINT "relationship_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "relationship_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
