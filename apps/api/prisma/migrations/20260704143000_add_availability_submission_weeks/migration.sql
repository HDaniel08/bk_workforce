DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AvailabilitySubmissionStatus') THEN
    CREATE TYPE "AvailabilitySubmissionStatus" AS ENUM ('OPEN', 'CLOSED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "AvailabilitySubmissionWeek" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "status" "AvailabilitySubmissionStatus" NOT NULL DEFAULT 'OPEN',
    "openedByUserId" TEXT,
    "closedByUserId" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvailabilitySubmissionWeek_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AvailabilitySubmissionWeek_tenantId_weekStartDate_key" ON "AvailabilitySubmissionWeek"("tenantId", "weekStartDate");
CREATE INDEX IF NOT EXISTS "AvailabilitySubmissionWeek_tenantId_idx" ON "AvailabilitySubmissionWeek"("tenantId");
CREATE INDEX IF NOT EXISTS "AvailabilitySubmissionWeek_weekStartDate_idx" ON "AvailabilitySubmissionWeek"("weekStartDate");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'AvailabilitySubmissionWeek_tenantId_fkey'
  ) THEN
    ALTER TABLE "AvailabilitySubmissionWeek"
    ADD CONSTRAINT "AvailabilitySubmissionWeek_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
