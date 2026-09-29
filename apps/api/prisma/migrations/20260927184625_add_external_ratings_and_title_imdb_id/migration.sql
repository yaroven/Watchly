-- CreateEnum
CREATE TYPE "ExternalRatingSource" AS ENUM ('IMDB', 'METACRITIC', 'ROTTEN_TOMATOES');

-- AlterTable
ALTER TABLE "Title" ADD COLUMN     "imdbId" TEXT,
ALTER COLUMN "posterUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "ExternalRatings" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "source" "ExternalRatingSource" NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "votesCount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalRatings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExternalRatings_titleId_source_key" ON "ExternalRatings"("titleId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "Title_imdbId_key" ON "Title"("imdbId");

-- AddForeignKey
ALTER TABLE "ExternalRatings" ADD CONSTRAINT "ExternalRatings_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

