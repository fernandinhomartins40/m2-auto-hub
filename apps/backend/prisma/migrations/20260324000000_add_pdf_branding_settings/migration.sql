ALTER TABLE "settings"
ADD COLUMN "pdfHeaderLogoUrl" TEXT,
ADD COLUMN "pdfHeaderHtml" TEXT NOT NULL DEFAULT '',
ADD COLUMN "pdfFooterLogoUrl" TEXT,
ADD COLUMN "pdfFooterHtml" TEXT NOT NULL DEFAULT '';
