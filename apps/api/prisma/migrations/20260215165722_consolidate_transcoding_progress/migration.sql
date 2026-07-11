-- CreateTable
CREATE TABLE "VideoTranscodingProgress" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "progressPercentage" INTEGER NOT NULL DEFAULT 0,
    "titleId" TEXT,
    "episodeId" TEXT,

    CONSTRAINT "VideoTranscodingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoTranscodingProgress_titleId_key" ON "VideoTranscodingProgress"("titleId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoTranscodingProgress_episodeId_key" ON "VideoTranscodingProgress"("episodeId");

-- CreateIndex
CREATE INDEX "VideoTranscodingProgress_titleId_idx" ON "VideoTranscodingProgress"("titleId");

-- CreateIndex
CREATE INDEX "VideoTranscodingProgress_episodeId_idx" ON "VideoTranscodingProgress"("episodeId");

-- AddForeignKey
ALTER TABLE "VideoTranscodingProgress" ADD CONSTRAINT "VideoTranscodingProgress_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoTranscodingProgress" ADD CONSTRAINT "VideoTranscodingProgress_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
