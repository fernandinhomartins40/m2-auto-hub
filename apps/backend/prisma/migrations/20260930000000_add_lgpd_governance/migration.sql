CREATE TYPE "PrivacyRequestType" AS ENUM ('CONFIRMATION', 'ACCESS', 'CORRECTION', 'PORTABILITY', 'DELETION', 'REVOCATION', 'INFORMATION', 'OPPOSITION');
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('OPEN', 'IDENTITY_CHECK', 'IN_REVIEW', 'COMPLETED', 'REJECTED');
CREATE TYPE "ConsentPurpose" AS ENUM ('ESSENTIAL', 'ANALYTICS', 'MARKETING');
CREATE TYPE "SecurityIncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "SecurityIncidentStatus" AS ENUM ('OPEN', 'CONTAINED', 'INVESTIGATING', 'REMEDIATED', 'CLOSED');

CREATE TABLE "privacy_requests" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "type" "PrivacyRequestType" NOT NULL,
  "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'OPEN',
  "details" TEXT,
  "response" TEXT,
  "identityVerifiedAt" TIMESTAMP(3),
  "dueAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "reviewedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "consent_records" (
  "id" TEXT NOT NULL,
  "customerId" TEXT,
  "subjectKey" TEXT NOT NULL,
  "purpose" "ConsentPurpose" NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "granted" BOOLEAN NOT NULL,
  "source" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_incidents" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" "SecurityIncidentSeverity" NOT NULL,
  "status" "SecurityIncidentStatus" NOT NULL DEFAULT 'OPEN',
  "detectedAt" TIMESTAMP(3) NOT NULL,
  "affectedDataCategories" JSONB,
  "estimatedSubjects" INTEGER,
  "riskAssessment" TEXT,
  "containmentActions" TEXT,
  "notificationRequired" BOOLEAN,
  "notifiedAnpdAt" TIMESTAMP(3),
  "notifiedSubjectsAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "reportedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "security_incidents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "privacy_requests_customerId_createdAt_idx" ON "privacy_requests"("customerId", "createdAt");
CREATE INDEX "privacy_requests_status_dueAt_idx" ON "privacy_requests"("status", "dueAt");
CREATE INDEX "consent_records_subjectKey_purpose_createdAt_idx" ON "consent_records"("subjectKey", "purpose", "createdAt");
CREATE INDEX "consent_records_customerId_createdAt_idx" ON "consent_records"("customerId", "createdAt");
CREATE INDEX "security_incidents_status_severity_idx" ON "security_incidents"("status", "severity");
CREATE INDEX "security_incidents_detectedAt_idx" ON "security_incidents"("detectedAt");

ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_requests" ADD CONSTRAINT "privacy_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
