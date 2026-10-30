CREATE TYPE "ManagerDayKind" AS ENUM ('WORK', 'REST', 'VACATION');
CREATE TYPE "ManagerMonthStatus" AS ENUM ('DRAFT', 'PUBLISHED');

ALTER TABLE "Tenant" ADD COLUMN "managerScheduleOwnerId" TEXT;
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_managerScheduleOwnerId_fkey"
  FOREIGN KEY ("managerScheduleOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ManagerDayRequest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "kind" "ManagerDayKind" NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManagerDayRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManagerDayRequest_userId_date_key" ON "ManagerDayRequest"("userId", "date");
CREATE INDEX "ManagerDayRequest_tenantId_date_idx" ON "ManagerDayRequest"("tenantId", "date");
ALTER TABLE "ManagerDayRequest" ADD CONSTRAINT "ManagerDayRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManagerDayRequest" ADD CONSTRAINT "ManagerDayRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ManagerScheduleMonth" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "monthStartDate" DATE NOT NULL,
  "status" "ManagerMonthStatus" NOT NULL DEFAULT 'DRAFT',
  "expectedWorkDays" INTEGER NOT NULL DEFAULT 0,
  "expectedRestDays" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManagerScheduleMonth_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManagerScheduleMonth_tenantId_monthStartDate_key" ON "ManagerScheduleMonth"("tenantId", "monthStartDate");
ALTER TABLE "ManagerScheduleMonth" ADD CONSTRAINT "ManagerScheduleMonth_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ManagerScheduleDay" (
  "id" TEXT NOT NULL,
  "monthId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "kind" "ManagerDayKind" NOT NULL,
  "startTime" TEXT,
  "endTime" TEXT,
  "note" TEXT,
  "paidMinutes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManagerScheduleDay_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManagerScheduleDay_monthId_userId_date_key" ON "ManagerScheduleDay"("monthId", "userId", "date");
CREATE INDEX "ManagerScheduleDay_userId_date_idx" ON "ManagerScheduleDay"("userId", "date");
ALTER TABLE "ManagerScheduleDay" ADD CONSTRAINT "ManagerScheduleDay_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "ManagerScheduleMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManagerScheduleDay" ADD CONSTRAINT "ManagerScheduleDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "Tenant" t SET "managerScheduleOwnerId" = (
  SELECT u."id" FROM "User" u
  WHERE u."tenantId" = t."id" AND u."employeeSubRole" = 'MANAGER'
    AND u."isActive" = true AND u."isDeleted" = false
  ORDER BY u."createdAt", u."id" LIMIT 1
);
