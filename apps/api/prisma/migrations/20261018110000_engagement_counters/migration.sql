-- CreateEnum
CREATE TYPE "EngagementEntityType" AS ENUM ('TITLE', 'POST', 'COMMENT');

-- CreateTable
CREATE TABLE "EngagementCounters" (
    "entityType" "EngagementEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "dislikes" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EngagementCounters_pkey" PRIMARY KEY ("entityType", "entityId")
);

-- Backfill: one row per subject that has either reactions or comments today.
-- The two sources are counted separately and merged, because a subject can have
-- one without the other.
INSERT INTO "EngagementCounters" ("entityType", "entityId", "likes", "dislikes", "commentCount")
SELECT subject."entityType", subject."entityId",
       COALESCE(r.likes, 0), COALESCE(r.dislikes, 0), COALESCE(c.comments, 0)
FROM (
    SELECT DISTINCT "entityType"::text AS "entityType", "entityId" FROM "Reaction"
    UNION
    SELECT DISTINCT "entityType"::text AS "entityType", "entityId" FROM "Comment"
) AS raw
CROSS JOIN LATERAL (
    SELECT raw."entityType"::"EngagementEntityType" AS "entityType", raw."entityId" AS "entityId"
) AS subject
LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE "type" = 'LIKE')    AS likes,
           COUNT(*) FILTER (WHERE "type" = 'DISLIKE') AS dislikes
    FROM "Reaction"
    WHERE "entityType"::text = raw."entityType" AND "entityId" = raw."entityId"
) AS r ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS comments
    FROM "Comment"
    WHERE "entityType"::text = raw."entityType" AND "entityId" = raw."entityId"
) AS c ON TRUE
ON CONFLICT ("entityType", "entityId") DO NOTHING;

-- AlterTable: the shared counters move out of the title-only row.
ALTER TABLE "TitleEngagement" DROP COLUMN "likes";
ALTER TABLE "TitleEngagement" DROP COLUMN "dislikes";
