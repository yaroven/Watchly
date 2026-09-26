-- AlterTable: temporary defaults backfill the 9 existing rows; schema.prisma declares
-- no @default for these fields, so the defaults are dropped right after.
ALTER TABLE "Title"
  ADD COLUMN "closedCaption" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "director" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "network" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "runtime" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Title"
  ALTER COLUMN "closedCaption" DROP DEFAULT,
  ALTER COLUMN "director" DROP DEFAULT,
  ALTER COLUMN "network" DROP DEFAULT,
  ALTER COLUMN "runtime" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_GenreToTitle" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_GenreToTitle_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE INDEX "_GenreToTitle_B_index" ON "_GenreToTitle"("B");

-- AddForeignKey
ALTER TABLE "_GenreToTitle" ADD CONSTRAINT "_GenreToTitle_A_fkey" FOREIGN KEY ("A") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToTitle" ADD CONSTRAINT "_GenreToTitle_B_fkey" FOREIGN KEY ("B") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
