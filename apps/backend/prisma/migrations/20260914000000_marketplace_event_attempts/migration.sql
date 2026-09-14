-- Contador de tentativas de processamento de evento de marketplace.
-- Sem ele, um evento que falha de forma permanente era reprocessado a cada 30s
-- indefinidamente. O processador agora desiste apos um numero maximo de
-- tentativas e deixa o evento registrado com o erro.
ALTER TABLE "marketplace_events" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
