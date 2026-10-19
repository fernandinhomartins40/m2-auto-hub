ALTER TABLE "ellon_connections" ADD COLUMN "lastFullProductSyncAt" TIMESTAMP(3);
ALTER TABLE "ellon_connections" ADD COLUMN "lastCustomerSyncAt" TIMESTAMP(3);
ALTER TABLE "ellon_connections" ADD COLUMN "lastCustomerExportScanAt" TIMESTAMP(3);

-- O checkpoint incremental anterior podia ser gravado após uma carga inicial
-- incompleta, impedindo para sempre a importação dos produtos que faltaram.
-- Zerar os checkpoints força uma carga completa de produtos e do histórico de
-- pedidos/vendas na próxima execução.
UPDATE "ellon_connections" SET "lastProductSyncAt" = NULL, "lastOrderSyncAt" = NULL;

-- Grupos já importados como texto no produto passam a existir como categorias
-- gerenciadas, para aparecerem no menu da loja.
INSERT INTO "product_categories" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, src."category", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (lower(btrim(p."category"))) btrim(p."category") AS "category"
  FROM "products" p
  WHERE btrim(p."category") <> ''
  ORDER BY lower(btrim(p."category")), p."category"
) src
WHERE NOT EXISTS (
  SELECT 1 FROM "product_categories" c WHERE lower(c."name") = lower(src."category")
);
