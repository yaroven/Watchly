-- Posters move from a stored URL to a stored object key.
--
-- The old column held a presigned read URL with the default one-hour expiry, so
-- every value in it is already dead. The key is deterministic from the row id
-- (`posters/<kind>/<id>`), so "there was a poster" is recoverable without
-- parsing those URLs: backfill the key wherever the URL was set, then drop it.

-- Title
ALTER TABLE "Title" ADD COLUMN "posterKey" TEXT;
UPDATE "Title" SET "posterKey" = 'posters/titles/' || "id" WHERE "posterUrl" IS NOT NULL;
ALTER TABLE "Title" DROP COLUMN "posterUrl";

-- Season
ALTER TABLE "Season" ADD COLUMN "posterKey" TEXT;
UPDATE "Season" SET "posterKey" = 'posters/seasons/' || "id" WHERE "posterUrl" IS NOT NULL;
ALTER TABLE "Season" DROP COLUMN "posterUrl";

-- Artist
ALTER TABLE "Artist" ADD COLUMN "photoKey" TEXT;
UPDATE "Artist" SET "photoKey" = 'posters/artists/' || "id" WHERE "photoUrl" IS NOT NULL;
ALTER TABLE "Artist" DROP COLUMN "photoUrl";
