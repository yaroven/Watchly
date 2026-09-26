-- CreateTable
CREATE TABLE "Artist" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,

    CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CastCredit" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "character" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CastCredit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CastCredit_artistId_idx" ON "CastCredit"("artistId");

-- CreateIndex
CREATE UNIQUE INDEX "CastCredit_titleId_artistId_key" ON "CastCredit"("titleId", "artistId");

-- AddForeignKey
ALTER TABLE "CastCredit" ADD CONSTRAINT "CastCredit_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CastCredit" ADD CONSTRAINT "CastCredit_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
