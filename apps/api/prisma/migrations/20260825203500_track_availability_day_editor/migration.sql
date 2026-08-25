CREATE TYPE "AvailabilityDayEditorType" AS ENUM ('SELF', 'MANAGER', 'SYSTEM');

ALTER TABLE "AvailabilityDay"
ADD COLUMN "editorType" "AvailabilityDayEditorType" NOT NULL DEFAULT 'SYSTEM',
ADD COLUMN "lastModifiedByUserId" TEXT;

UPDATE "AvailabilityDay" AS day
SET
  "editorType" = 'SELF',
  "lastModifiedByUserId" = week."userId"
FROM "AvailabilityWeek" AS week
WHERE day."availabilityWeekId" = week."id";

CREATE INDEX "AvailabilityDay_lastModifiedByUserId_idx"
ON "AvailabilityDay"("lastModifiedByUserId");

ALTER TABLE "AvailabilityDay"
ADD CONSTRAINT "AvailabilityDay_lastModifiedByUserId_fkey"
FOREIGN KEY ("lastModifiedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
