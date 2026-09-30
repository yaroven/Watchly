-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'DISLIKE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "displayName" TEXT;

-- CreateTable
CREATE TABLE "TitleRating" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TitleRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TitleComment" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "hasSpoiler" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parentId" TEXT,

    CONSTRAINT "TitleComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReaction" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentReport" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TitleRating_titleId_idx" ON "TitleRating"("titleId");

-- CreateIndex
CREATE UNIQUE INDEX "TitleRating_titleId_userId_key" ON "TitleRating"("titleId", "userId");

-- CreateIndex
CREATE INDEX "TitleComment_titleId_parentId_createdAt_idx" ON "TitleComment"("titleId", "parentId", "createdAt");

-- CreateIndex
CREATE INDEX "CommentReaction_commentId_type_idx" ON "CommentReaction"("commentId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CommentReaction_commentId_userId_key" ON "CommentReaction"("commentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentReport_commentId_userId_key" ON "CommentReport"("commentId", "userId");

-- AddForeignKey
ALTER TABLE "TitleRating" ADD CONSTRAINT "TitleRating_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitleRating" ADD CONSTRAINT "TitleRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitleComment" ADD CONSTRAINT "TitleComment_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitleComment" ADD CONSTRAINT "TitleComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitleComment" ADD CONSTRAINT "TitleComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TitleComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TitleComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "TitleComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReport" ADD CONSTRAINT "CommentReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

