-- Replaces the polymorphic (entityType, entityId) pair on four tables with a
-- nullable foreign key per kind — an exclusive arc. The point is the foreign
-- key: the database cascades these rows away with their subject again, which
-- the polymorphic key could not express (ADR-0015 supersedes ADR-0012..0014).

-- ---------------------------------------------------------------- Reaction --
ALTER TABLE "Reaction" ADD COLUMN "titleId" TEXT;
ALTER TABLE "Reaction" ADD COLUMN "commentId" TEXT;

UPDATE "Reaction" SET "titleId" = "entityId" WHERE "entityType" = 'TITLE';
UPDATE "Reaction" SET "commentId" = "entityId" WHERE "entityType" = 'COMMENT';

-- A reaction whose subject is already gone cannot be given a foreign key. Rows
-- like that were reachable precisely because the old key had none.
DELETE FROM "Reaction" r
WHERE ("titleId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Title" t WHERE t."id" = r."titleId"))
   OR ("commentId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Comment" c WHERE c."id" = r."commentId"))
   OR ("titleId" IS NULL AND "commentId" IS NULL);

DROP INDEX "Reaction_entityType_entityId_type_idx";
DROP INDEX "Reaction_entityType_entityId_userId_key";
ALTER TABLE "Reaction" DROP COLUMN "entityType";
ALTER TABLE "Reaction" DROP COLUMN "entityId";

CREATE UNIQUE INDEX "Reaction_titleId_userId_key" ON "Reaction"("titleId", "userId");
CREATE UNIQUE INDEX "Reaction_commentId_userId_key" ON "Reaction"("commentId", "userId");
CREATE INDEX "Reaction_titleId_type_idx" ON "Reaction"("titleId", "type");
CREATE INDEX "Reaction_commentId_type_idx" ON "Reaction"("commentId", "type");

ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_titleId_fkey"
  FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one arc. Prisma cannot declare this, so it lives here and nowhere
-- else — see docs/DOMAIN.md for the list of hand-written constraints.
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_one_subject"
  CHECK (num_nonnulls("titleId", "commentId") = 1);

-- ----------------------------------------------------------------- Comment --
ALTER TABLE "Comment" ADD COLUMN "titleId" TEXT;
ALTER TABLE "Comment" ADD COLUMN "parentId" TEXT;

UPDATE "Comment" SET "titleId" = "entityId" WHERE "entityType" = 'TITLE';
UPDATE "Comment" SET "parentId" = "entityId" WHERE "entityType" = 'COMMENT';

-- POST had no table behind it, so no row could have pointed at one.
DELETE FROM "Comment" c
WHERE ("titleId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Title" t WHERE t."id" = c."titleId"))
   OR ("titleId" IS NULL AND "parentId" IS NULL);

DROP INDEX "Comment_entityType_entityId_createdAt_idx";
ALTER TABLE "Comment" DROP COLUMN "entityType";
ALTER TABLE "Comment" DROP COLUMN "entityId";

CREATE INDEX "Comment_titleId_createdAt_idx" ON "Comment"("titleId", "createdAt");
CREATE INDEX "Comment_parentId_createdAt_idx" ON "Comment"("parentId", "createdAt");

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_titleId_fkey"
  FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_one_subject"
  CHECK (num_nonnulls("titleId", "parentId") = 1);

-- ------------------------------------------------------------------ Report --
ALTER TABLE "Report" ADD COLUMN "commentId" TEXT;

UPDATE "Report" SET "commentId" = "entityId" WHERE "entityType" = 'COMMENT';

DELETE FROM "Report" r
WHERE "commentId" IS NULL
   OR NOT EXISTS (SELECT 1 FROM "Comment" c WHERE c."id" = r."commentId");

DROP INDEX "Report_entityType_entityId_createdAt_idx";
DROP INDEX "Report_entityType_entityId_userId_key";
ALTER TABLE "Report" DROP COLUMN "entityType";
ALTER TABLE "Report" DROP COLUMN "entityId";
ALTER TABLE "Report" ALTER COLUMN "commentId" SET NOT NULL;

CREATE UNIQUE INDEX "Report_commentId_userId_key" ON "Report"("commentId", "userId");
CREATE INDEX "Report_commentId_createdAt_idx" ON "Report"("commentId", "createdAt");

ALTER TABLE "Report" ADD CONSTRAINT "Report_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------ EngagementCounters --
ALTER TABLE "EngagementCounters" ADD COLUMN "id" TEXT;
ALTER TABLE "EngagementCounters" ADD COLUMN "titleId" TEXT;
ALTER TABLE "EngagementCounters" ADD COLUMN "commentId" TEXT;

UPDATE "EngagementCounters" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
UPDATE "EngagementCounters" SET "titleId" = "entityId" WHERE "entityType" = 'TITLE';
UPDATE "EngagementCounters" SET "commentId" = "entityId" WHERE "entityType" = 'COMMENT';

DELETE FROM "EngagementCounters" e
WHERE ("titleId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Title" t WHERE t."id" = e."titleId"))
   OR ("commentId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Comment" c WHERE c."id" = e."commentId"))
   OR ("titleId" IS NULL AND "commentId" IS NULL);

ALTER TABLE "EngagementCounters" DROP CONSTRAINT "EngagementCounters_pkey";
ALTER TABLE "EngagementCounters" DROP COLUMN "entityType";
ALTER TABLE "EngagementCounters" DROP COLUMN "entityId";
ALTER TABLE "EngagementCounters" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "EngagementCounters" ADD CONSTRAINT "EngagementCounters_pkey" PRIMARY KEY ("id");

CREATE UNIQUE INDEX "EngagementCounters_titleId_key" ON "EngagementCounters"("titleId");
CREATE UNIQUE INDEX "EngagementCounters_commentId_key" ON "EngagementCounters"("commentId");

ALTER TABLE "EngagementCounters" ADD CONSTRAINT "EngagementCounters_titleId_fkey"
  FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EngagementCounters" ADD CONSTRAINT "EngagementCounters_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EngagementCounters" ADD CONSTRAINT "EngagementCounters_one_subject"
  CHECK (num_nonnulls("titleId", "commentId") = 1);

-- -------------------------------------------------------------------- Enums --
DROP TYPE "ReactionEntityType";
DROP TYPE "CommentEntityType";
DROP TYPE "ReportEntityType";
DROP TYPE "EngagementEntityType";
