-- DropIndex
DROP INDEX "Title_imdbId_key";

-- AlterTable
ALTER TABLE "Title" DROP COLUMN "imdbId";

-- CreateTable
CREATE TABLE "TitleExternalId" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "source" "ExternalRatingSource" NOT NULL,
    "externalId" TEXT NOT NULL,

    CONSTRAINT "TitleExternalId_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TitleExternalId_titleId_source_key" ON "TitleExternalId"("titleId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "TitleExternalId_source_externalId_key" ON "TitleExternalId"("source", "externalId");

-- AddForeignKey
ALTER TABLE "TitleExternalId" ADD CONSTRAINT "TitleExternalId_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
