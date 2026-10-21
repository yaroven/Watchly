-- CreateEnum
CREATE TYPE "CommentEntityType" AS ENUM ('TITLE', 'POST', 'COMMENT');

-- RenameTable: the rows carry over, so this is a rename rather than a copy.
ALTER TABLE "TitleComment" RENAME TO "Comment";
ALTER TABLE "Comment" RENAME CONSTRAINT "TitleComment_pkey" TO "Comment_pkey";
ALTER TABLE "Comment" RENAME CONSTRAINT "TitleComment_userId_fkey" TO "Comment_userId_fkey";

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "entityType" "CommentEntityType";
ALTER TABLE "Comment" ADD COLUMN "entityId" TEXT;

-- Backfill: a root comment hangs off its title, a reply off the comment it
-- answers. The two old columns were never both set, which is what makes one
-- polymorphic key able to replace them.
UPDATE "Comment"
SET "entityType" = CASE WHEN "parentId" IS NULL THEN 'TITLE'::"CommentEntityType"
                        ELSE 'COMMENT'::"CommentEntityType" END,
    "entityId"   = COALESCE("parentId", "titleId");

ALTER TABLE "Comment" ALTER COLUMN "entityType" SET NOT NULL;
ALTER TABLE "Comment" ALTER COLUMN "entityId" SET NOT NULL;

-- DropForeignKey: `entityId` points at a title or a comment, so it can carry
-- neither of these — see ADR-0013 for what stands in for the cascade.
ALTER TABLE "Comment" DROP CONSTRAINT "TitleComment_titleId_fkey";
ALTER TABLE "Comment" DROP CONSTRAINT "TitleComment_parentId_fkey";

-- DropIndex
DROP INDEX "TitleComment_titleId_parentId_createdAt_idx";

-- AlterTable
ALTER TABLE "Comment" DROP COLUMN "titleId";
ALTER TABLE "Comment" DROP COLUMN "parentId";

-- CreateIndex
CREATE INDEX "Comment_entityType_entityId_createdAt_idx" ON "Comment"("entityType", "entityId", "createdAt");
