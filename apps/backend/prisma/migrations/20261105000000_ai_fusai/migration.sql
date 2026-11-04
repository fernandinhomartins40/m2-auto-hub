-- IA passa a usar a fusai, que devolve o custo em reais.
ALTER TABLE "ai_usage" RENAME COLUMN "costUsd" TO "costBrl";
ALTER TABLE "marketplace_ai_suggestions" RENAME COLUMN "costUsd" TO "costBrl";
ALTER TABLE "ai_settings" DROP COLUMN "usdToBrl";
ALTER TABLE "ai_settings" ALTER COLUMN "model" SET DEFAULT 'fuse/deepseek-chat';
UPDATE "ai_settings" SET "model" = 'fuse/deepseek-chat' WHERE "model" NOT LIKE 'fuse/%';
