-- CreateEnum
CREATE TYPE "AgeRating" AS ENUM ('AGE_0', 'AGE_12', 'AGE_16', 'AGE_18');

-- AlterTable: temporary defaults backfill the 9 existing rows; schema.prisma declares
-- no @default for these fields, so the defaults are dropped right after.
ALTER TABLE "Title"
  ADD COLUMN "ageRating" "AgeRating" NOT NULL DEFAULT 'AGE_12',
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'US',
  ADD COLUMN "releaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "language" TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN "trailerUrl" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Title"
  ALTER COLUMN "ageRating" DROP DEFAULT,
  ALTER COLUMN "country" DROP DEFAULT,
  ALTER COLUMN "releaseDate" DROP DEFAULT,
  ALTER COLUMN "language" DROP DEFAULT,
  ALTER COLUMN "trailerUrl" DROP DEFAULT;
