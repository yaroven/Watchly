-- CreateEnum
CREATE TYPE "TitleType" AS ENUM ('MOVIE', 'SERIES');

-- AlterTable
ALTER TABLE "Title" RENAME CONSTRAINT "Content_pkey" TO "Title_pkey";
