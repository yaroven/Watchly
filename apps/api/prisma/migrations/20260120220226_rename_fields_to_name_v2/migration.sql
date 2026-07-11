-- Rename Table Content to Title
ALTER TABLE "Content" RENAME TO "Title";

-- Rename column title to name in Title
ALTER TABLE "Title" RENAME COLUMN "title" TO "name";

-- Rename column title to name in Season
ALTER TABLE "Season" RENAME COLUMN "title" TO "name";

-- Rename column contentId to titleId in Season
ALTER TABLE "Season" RENAME COLUMN "contentId" TO "titleId";

-- Rename column title to name in Episode
ALTER TABLE "Episode" RENAME COLUMN "title" TO "name";

-- Rename Index
ALTER INDEX "Content_title_description_type_idx" RENAME TO "Title_name_description_type_idx";

-- Rename Foreign Key
ALTER TABLE "Season" RENAME CONSTRAINT "Season_contentId_fkey" TO "Season_titleId_fkey";

-- Re-create unique index on Season
-- (Dropping and recreating is safer for index names)
DROP INDEX IF EXISTS "Season_contentId_number_key";
CREATE UNIQUE INDEX "Season_titleId_number_key" ON "Season"("titleId", "number");
