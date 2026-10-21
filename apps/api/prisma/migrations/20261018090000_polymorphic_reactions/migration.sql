-- CreateEnum
CREATE TYPE "ReactionEntityType" AS ENUM ('TITLE', 'COMMENT');

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "entityType" "ReactionEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_entityType_entityId_userId_key" ON "Reaction"("entityType", "entityId", "userId");

-- CreateIndex
CREATE INDEX "Reaction_entityType_entityId_type_idx" ON "Reaction"("entityType", "entityId", "type");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: both tables kept uuid primary keys, so the ids carry over and stay
-- unique across the union. `entityId` gets no foreign key of its own, which is
-- why the rows are filtered through a join — a reaction whose subject is
-- already gone must not be carried into a table that cannot cascade it away.
INSERT INTO "Reaction" ("id", "entityType", "entityId", "userId", "type", "createdAt")
SELECT r."id", 'TITLE', r."titleId", r."userId", r."type", r."createdAt"
FROM "TitleReaction" r
JOIN "Title" t ON t."id" = r."titleId";

INSERT INTO "Reaction" ("id", "entityType", "entityId", "userId", "type", "createdAt")
SELECT r."id", 'COMMENT', r."commentId", r."userId", r."type", r."createdAt"
FROM "CommentReaction" r
JOIN "TitleComment" c ON c."id" = r."commentId";

-- DropTable
DROP TABLE "TitleReaction";

-- DropTable
DROP TABLE "CommentReaction";
