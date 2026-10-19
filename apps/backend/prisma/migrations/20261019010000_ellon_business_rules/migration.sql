ALTER TABLE "ellon_connections" ADD COLUMN "exportOrderSources" "OrderSource"[] NOT NULL DEFAULT ARRAY['WEB', 'APP', 'PHONE']::"OrderSource"[];
ALTER TABLE "ellon_connections" ADD COLUMN "stockIncludesPreOrders" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ellon_connections" ADD COLUMN "reservationTtlDays" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "ellon_connections" ADD COLUMN "serviceItemTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ellon_connections" ADD COLUMN "defaultCustomerCode" INTEGER;
ALTER TABLE "ellon_connections" ADD COLUMN "paymentMethodMap" JSONB;
