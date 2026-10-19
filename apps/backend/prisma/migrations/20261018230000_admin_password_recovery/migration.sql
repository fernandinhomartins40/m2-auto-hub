ALTER TABLE "admins" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);
CREATE TABLE "admin_password_reset_tokens" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "adminId" TEXT NOT NULL REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "passwordDigest" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "admin_password_reset_tokens_tokenHash_key" ON "admin_password_reset_tokens"("tokenHash");
CREATE INDEX "admin_password_reset_tokens_adminId_idx" ON "admin_password_reset_tokens"("adminId");
CREATE INDEX "admin_password_reset_tokens_expiresAt_idx" ON "admin_password_reset_tokens"("expiresAt");
