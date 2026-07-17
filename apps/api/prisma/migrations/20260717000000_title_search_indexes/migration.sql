-- DropIndex
DROP INDEX "Title_name_description_type_idx";

-- CreateIndex
CREATE INDEX "Title_type_transcodingStatus_idx" ON "Title"("type", "transcodingStatus");

-- Enable trigram support for ILIKE/contains search on Title.name.
-- Not representable in schema.prisma without the extendedIndexes/postgresqlExtensions
-- preview features, so it's managed here as raw SQL.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Title_name_trgm_idx" ON "Title" USING GIN (name gin_trgm_ops);
