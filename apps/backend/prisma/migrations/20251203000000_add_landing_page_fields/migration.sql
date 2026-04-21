-- AddContactPageAndAboutPage
-- Adiciona os campos contactPage e aboutPage às tabelas landing_page_config e landing_page_config_history

-- Adicionar colunas com valores padrão temporários
ALTER TABLE "landing_page_config"
ADD COLUMN IF NOT EXISTS "contactPage" TEXT DEFAULT '{"enabled":true,"title":"Entre em Contato","subtitle":"Estamos aqui para ajudar você","sections":[]}';

ALTER TABLE "landing_page_config"
ADD COLUMN IF NOT EXISTS "aboutPage" TEXT DEFAULT '{"enabled":true,"title":"Sobre Nós","subtitle":"Conheça nossa história","sections":[]}';

ALTER TABLE "landing_page_config_history"
ADD COLUMN IF NOT EXISTS "contactPage" TEXT DEFAULT '{}';

ALTER TABLE "landing_page_config_history"
ADD COLUMN IF NOT EXISTS "aboutPage" TEXT DEFAULT '{}';

-- Atualizar registros existentes que ainda têm valores padrão
UPDATE "landing_page_config"
SET
  "contactPage" = '{"enabled":true,"title":"Entre em Contato","subtitle":"Estamos aqui para ajudar você","sections":[]}'
WHERE "contactPage" = '{}' OR "contactPage" IS NULL;

UPDATE "landing_page_config"
SET
  "aboutPage" = '{"enabled":true,"title":"Sobre Nós","subtitle":"Conheça nossa história","sections":[]}'
WHERE "aboutPage" = '{}' OR "aboutPage" IS NULL;

UPDATE "landing_page_config_history"
SET
  "contactPage" = COALESCE("contactPage", '{}')
WHERE "contactPage" IS NULL;

UPDATE "landing_page_config_history"
SET
  "aboutPage" = COALESCE("aboutPage", '{}')
WHERE "aboutPage" IS NULL;

-- Remover valores padrão (tornar NOT NULL sem default)
ALTER TABLE "landing_page_config"
ALTER COLUMN "contactPage" DROP DEFAULT;

ALTER TABLE "landing_page_config"
ALTER COLUMN "aboutPage" DROP DEFAULT;

ALTER TABLE "landing_page_config_history"
ALTER COLUMN "contactPage" DROP DEFAULT;

ALTER TABLE "landing_page_config_history"
ALTER COLUMN "aboutPage" DROP DEFAULT;

-- Garantir que as colunas não sejam NULL
ALTER TABLE "landing_page_config"
ALTER COLUMN "contactPage" SET NOT NULL;

ALTER TABLE "landing_page_config"
ALTER COLUMN "aboutPage" SET NOT NULL;

ALTER TABLE "landing_page_config_history"
ALTER COLUMN "contactPage" SET NOT NULL;

ALTER TABLE "landing_page_config_history"
ALTER COLUMN "aboutPage" SET NOT NULL;
