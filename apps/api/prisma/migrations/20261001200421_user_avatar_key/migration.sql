-- Nothing ever wrote `avatarUrl`, so there is no data to carry over. The
-- replacement holds an object key: a URL in a row bakes in the host, and a
-- presigned one bakes in an expiry.
ALTER TABLE "User" DROP COLUMN "avatarUrl",
ADD COLUMN     "avatarKey" TEXT;
