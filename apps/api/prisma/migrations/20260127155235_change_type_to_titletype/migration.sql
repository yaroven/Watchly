/*
  Warnings:

  - Changed the type of `type` on the `Title` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Title" ALTER COLUMN "type" TYPE "TitleType" USING "type"::text::"TitleType";

-- CreateIndex
-- Since we altered the column type, we should ensure the index is updated if necessary.
-- Prisma usually handles index recreation if it was dropped during a column drop, 
-- but since we are changing it to ALTER COLUMN, we can manually ensure the index exists.
DROP INDEX IF EXISTS "Title_name_description_type_idx";
CREATE INDEX "Title_name_description_type_idx" ON "Title"("name", "description", "type");
