-- CreateEnum
CREATE TYPE "RevisionAppointmentStatus" AS ENUM (
  'REQUESTED',
  'SCHEDULED',
  'IN_SERVICE',
  'COMPLETED',
  'CANCELLED'
);

-- CreateTable
CREATE TABLE "revision_appointments" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "vehicleId" TEXT NOT NULL,
  "status" "RevisionAppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
  "preferredDate" TIMESTAMP(3) NOT NULL,
  "scheduledAt" TIMESTAMP(3),
  "notes" TEXT,
  "adminNotes" TEXT,
  "cancellationReason" TEXT,
  "assignedMechanicId" TEXT,
  "mechanicName" TEXT,
  "revisionId" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "revision_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "revision_appointments_revisionId_key" ON "revision_appointments"("revisionId");

-- CreateIndex
CREATE INDEX "revision_appointments_customerId_idx" ON "revision_appointments"("customerId");

-- CreateIndex
CREATE INDEX "revision_appointments_vehicleId_idx" ON "revision_appointments"("vehicleId");

-- CreateIndex
CREATE INDEX "revision_appointments_status_idx" ON "revision_appointments"("status");

-- CreateIndex
CREATE INDEX "revision_appointments_preferredDate_idx" ON "revision_appointments"("preferredDate");

-- CreateIndex
CREATE INDEX "revision_appointments_scheduledAt_idx" ON "revision_appointments"("scheduledAt");

-- CreateIndex
CREATE INDEX "revision_appointments_assignedMechanicId_idx" ON "revision_appointments"("assignedMechanicId");

-- AddForeignKey
ALTER TABLE "revision_appointments"
ADD CONSTRAINT "revision_appointments_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_appointments"
ADD CONSTRAINT "revision_appointments_vehicleId_fkey"
FOREIGN KEY ("vehicleId") REFERENCES "customer_vehicles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_appointments"
ADD CONSTRAINT "revision_appointments_assignedMechanicId_fkey"
FOREIGN KEY ("assignedMechanicId") REFERENCES "admins"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revision_appointments"
ADD CONSTRAINT "revision_appointments_revisionId_fkey"
FOREIGN KEY ("revisionId") REFERENCES "revisions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
