ALTER TABLE "customers" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3), ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
CREATE TABLE "email_action_tokens" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_action_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "email_action_tokens_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "email_action_tokens_tokenHash_key" ON "email_action_tokens"("tokenHash");
CREATE INDEX "email_action_tokens_customerId_purpose_idx" ON "email_action_tokens"("customerId", "purpose");
CREATE INDEX "email_action_tokens_expiresAt_idx" ON "email_action_tokens"("expiresAt");
