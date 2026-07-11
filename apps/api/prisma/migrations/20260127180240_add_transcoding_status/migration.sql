-- CreateEnum
CREATE TYPE "TranscodingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN     "transcodingStatus" "TranscodingStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Title" ADD COLUMN     "transcodingStatus" "TranscodingStatus" NOT NULL DEFAULT 'PENDING';
