-- AlterTable
ALTER TABLE "CastCredit" ADD COLUMN     "characterTranslations" JSONB;

-- CreateTable
CREATE TABLE "TitleTranslation" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "TitleTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenreTranslation" (
    "id" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GenreTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeasonTranslation" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "SeasonTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeTranslation" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "EpisodeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TitleTranslation_titleId_locale_key" ON "TitleTranslation"("titleId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "GenreTranslation_genreId_locale_key" ON "GenreTranslation"("genreId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "GenreTranslation_locale_name_key" ON "GenreTranslation"("locale", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SeasonTranslation_seasonId_locale_key" ON "SeasonTranslation"("seasonId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "EpisodeTranslation_episodeId_locale_key" ON "EpisodeTranslation"("episodeId", "locale");

-- AddForeignKey
ALTER TABLE "TitleTranslation" ADD CONSTRAINT "TitleTranslation_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenreTranslation" ADD CONSTRAINT "GenreTranslation_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeasonTranslation" ADD CONSTRAINT "SeasonTranslation_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeTranslation" ADD CONSTRAINT "EpisodeTranslation_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
