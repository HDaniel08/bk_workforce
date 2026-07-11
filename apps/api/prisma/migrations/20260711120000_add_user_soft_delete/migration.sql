ALTER TABLE "User"
ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "User_isDeleted_idx" ON "User"("isDeleted");
