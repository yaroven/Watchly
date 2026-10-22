-- CreateEnum
CREATE TYPE "ReportEntityType" AS ENUM ('COMMENT', 'POST');

-- RenameTable
ALTER TABLE "CommentReport" RENAME TO "Report";
ALTER TABLE "Report" RENAME CONSTRAINT "CommentReport_pkey" TO "Report_pkey";
ALTER TABLE "Report" RENAME CONSTRAINT "CommentReport_userId_fkey" TO "Report_userId_fkey";

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "entityType" "ReportEntityType";
ALTER TABLE "Report" ADD COLUMN "entityId" TEXT;

-- Backfill: every report filed so far was against a comment.
UPDATE "Report"
SET "entityType" = 'COMMENT'::"ReportEntityType",
    "entityId"   = "commentId";

ALTER TABLE "Report" ALTER COLUMN "entityType" SET NOT NULL;
ALTER TABLE "Report" ALTER COLUMN "entityId" SET NOT NULL;

-- DropForeignKey: the subject is now a kind plus an id, which cannot reference
-- one table — see ADR-0013.
ALTER TABLE "Report" DROP CONSTRAINT "CommentReport_commentId_fkey";

-- DropIndex
DROP INDEX "CommentReport_commentId_userId_key";

-- AlterTable
ALTER TABLE "Report" DROP COLUMN "commentId";

-- CreateIndex
CREATE UNIQUE INDEX "Report_entityType_entityId_userId_key" ON "Report"("entityType", "entityId", "userId");

-- CreateIndex
CREATE INDEX "Report_entityType_entityId_createdAt_idx" ON "Report"("entityType", "entityId", "createdAt");
