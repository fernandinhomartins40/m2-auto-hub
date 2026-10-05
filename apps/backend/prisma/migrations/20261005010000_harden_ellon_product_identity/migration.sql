UPDATE "ellon_entity_links" SET "externalSequence" = 0 WHERE "externalSequence" IS NULL;
ALTER TABLE "ellon_entity_links" ALTER COLUMN "externalSequence" SET DEFAULT 0;
ALTER TABLE "ellon_entity_links" ALTER COLUMN "externalSequence" SET NOT NULL;
CREATE UNIQUE INDEX "ellon_entity_links_entityType_externalId_externalSequence_key"
  ON "ellon_entity_links"("entityType", "externalId", "externalSequence");

ALTER TABLE "ellon_connections" ADD COLUMN "usernameEncrypted" TEXT;
