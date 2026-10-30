CREATE TABLE "ManagerScheduleWeek" (
  "id" TEXT NOT NULL,
  "monthId" TEXT NOT NULL,
  "weekStartDate" DATE NOT NULL,
  "status" "ManagerMonthStatus" NOT NULL DEFAULT 'DRAFT',
  "publicationCount" INTEGER NOT NULL DEFAULT 0,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManagerScheduleWeek_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ManagerScheduleWeek_monthId_weekStartDate_key" ON "ManagerScheduleWeek"("monthId", "weekStartDate");
CREATE INDEX "ManagerScheduleWeek_weekStartDate_idx" ON "ManagerScheduleWeek"("weekStartDate");

ALTER TABLE "ManagerScheduleWeek"
ADD CONSTRAINT "ManagerScheduleWeek_monthId_fkey"
FOREIGN KEY ("monthId") REFERENCES "ManagerScheduleMonth"("id") ON DELETE CASCADE ON UPDATE CASCADE;
