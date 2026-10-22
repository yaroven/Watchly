-- CreateTable
CREATE TABLE "TitleEngagement" (
    "titleId" TEXT NOT NULL,
    "avgScore" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "dislikes" INTEGER NOT NULL DEFAULT 0,
    "watchlistCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TitleEngagement_pkey" PRIMARY KEY ("titleId")
);

-- AddForeignKey
ALTER TABLE "TitleEngagement" ADD CONSTRAINT "TitleEngagement_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill
INSERT INTO "TitleEngagement" (
    "titleId", "avgScore", "ratingCount", "likes", "dislikes", "watchlistCount"
)
SELECT t.id, r.avg_score, r.cnt, x.likes, x.dislikes, w.cnt
FROM "Title" t
LEFT JOIN LATERAL (
    SELECT AVG("score")::double precision AS avg_score, COUNT(*) AS cnt
    FROM "TitleRating" WHERE "titleId" = t.id
) r ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE "type" = 'LIKE')    AS likes,
           COUNT(*) FILTER (WHERE "type" = 'DISLIKE') AS dislikes
    FROM "TitleReaction" WHERE "titleId" = t.id
) x ON TRUE
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS cnt
    FROM "WatchlistItem" WHERE "titleId" = t.id
) w ON TRUE
ON CONFLICT ("titleId") DO NOTHING;
