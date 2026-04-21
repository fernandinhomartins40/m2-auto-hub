-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('NEW_QUOTE_REQUEST', 'QUOTE_RESPONDED', 'QUOTE_APPROVED', 'QUOTE_REJECTED', 'ORDER_STATUS_UPDATED', 'ORDER_CREATED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "NotificationRecipientType" AS ENUM ('ADMIN', 'CUSTOMER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "recipientType" "NotificationRecipientType" NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_recipientId_recipientType_read_idx" ON "notifications"("recipientId", "recipientType", "read");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");
