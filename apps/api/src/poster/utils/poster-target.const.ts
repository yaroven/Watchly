import { ImageKind } from "../../image-transcoder/image-profile.const";
import { PrismaService } from "../../prisma/prisma.service";
import { RawObjectKind } from "../../s3/raw-key";

export type PosterEntityKind = "titles" | "seasons" | "artists";

/** The three tables a poster or photo can hang off. */
export type PosterClient = Pick<PrismaService, "title" | "season" | "artist">;

/**
 * Everything that differs between the three entity kinds, in one place. The
 * only variation between them is the Prisma delegate and the column name, so
 * `read` and `write` live here rather than as two parallel `switch` statements
 * in `PosterService` — adding a fourth kind is one entry, not three edits.
 *
 * Closures rather than `{ model, column }` descriptors: indexing a Prisma
 * delegate by string needs an `any` cast, and `no-unsafe-member-access` is an
 * error in this project.
 */
export interface PosterTarget {
  imageKind: ImageKind;
  rawKind: RawObjectKind;
  label: string;
  read(client: PosterClient, id: string): Promise<{ key: string | null } | null>;
  write(client: PosterClient, id: string, key: string | null): Promise<void>;
}

export const POSTER_TARGETS: Record<PosterEntityKind, PosterTarget> = {
  titles: {
    imageKind: ImageKind.TITLE_POSTER,
    rawKind: RawObjectKind.TITLE_POSTER,
    label: "Title",
    read: async (client, id) => {
      const row = await client.title.findUnique({ where: { id }, select: { posterKey: true } });
      return row ? { key: row.posterKey } : null;
    },
    write: async (client, id, key) => {
      await client.title.update({ where: { id }, data: { posterKey: key } });
    },
  },
  seasons: {
    imageKind: ImageKind.SEASON_POSTER,
    rawKind: RawObjectKind.SEASON_POSTER,
    label: "Season",
    read: async (client, id) => {
      const row = await client.season.findUnique({ where: { id }, select: { posterKey: true } });
      return row ? { key: row.posterKey } : null;
    },
    write: async (client, id, key) => {
      await client.season.update({ where: { id }, data: { posterKey: key } });
    },
  },
  artists: {
    imageKind: ImageKind.ARTIST_PHOTO,
    rawKind: RawObjectKind.ARTIST_PHOTO,
    label: "Artist",
    // The column is photoKey here, which is the whole reason this is a table
    // and not a loop over one name.
    read: async (client, id) => {
      const row = await client.artist.findUnique({ where: { id }, select: { photoKey: true } });
      return row ? { key: row.photoKey } : null;
    },
    write: async (client, id, key) => {
      await client.artist.update({ where: { id }, data: { photoKey: key } });
    },
  },
};

export const POSTER_ENTITY_KINDS = Object.keys(POSTER_TARGETS) as PosterEntityKind[];
