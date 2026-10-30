ALTER TYPE "NotificationType" ADD VALUE 'MANAGER_SCHEDULE_PUBLISHED';
ALTER TYPE "NotificationType" ADD VALUE 'MANAGER_SCHEDULE_UPDATED';

ALTER TABLE "ManagerScheduleMonth" ADD COLUMN "publicationCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Notification" ADD COLUMN "scheduleMonth" TEXT;

UPDATE "ManagerScheduleMonth" AS month
SET "publicationCount" = GREATEST(
  CASE WHEN month."status" = 'PUBLISHED' THEN 1 ELSE 0 END,
  (SELECT COUNT(*)::INTEGER FROM "AuditLog" AS audit
   WHERE audit."entityType" = 'ManagerScheduleMonth'
     AND audit."entityId" = month."id"
     AND audit."action" = 'MANAGER_MONTH_PUBLISHED')
);
