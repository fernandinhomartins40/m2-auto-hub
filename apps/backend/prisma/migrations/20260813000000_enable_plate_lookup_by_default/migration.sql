-- A consulta de placa nasceu desligada porque na epoca dependia de uma API
-- paga. Hoje a camada principal e o navegador no servidor, que nao tem custo
-- por consulta, entao o padrao passa a ser ligado.
ALTER TABLE "settings" ALTER COLUMN "plateLookupEnabled" SET DEFAULT true;

-- Instalacoes que ja existiam ficaram com o valor antigo (false) e nunca
-- chegariam a usar a consulta gratuita.
UPDATE "settings" SET "plateLookupEnabled" = true WHERE "plateLookupEnabled" = false;
