import { PrismaService } from "../../prisma/prisma.service";
import { ImageKind } from "../../queues/image-transcoder/image-profile.const";
import { RawObjectKind } from "../../s3/raw-key";

export type ImageClient = Pick<PrismaService, "title" | "season" | "artist" | "user">;

export interface ImageTarget {
  rawKind: RawObjectKind;
  label: string;
  processedKey(ownerId: string, version: string): string;
  read(client: ImageClient, ownerId: string): Promise<{ key: string | null } | null>;
  write(client: ImageClient, ownerId: string, key: string | null): Promise<void>;
}

export const IMAGE_TARGETS: Record<ImageKind, ImageTarget> = {
  [ImageKind.TITLE_POSTER]: {
    rawKind: RawObjectKind.TITLE_POSTER,
    label: "Title",
    processedKey: (ownerId, version) => `posters/titles/${ownerId}/${version}.webp`,
    read: async (client, id) => {
      const row = await client.title.findUnique({ where: { id }, select: { posterKey: true } });
      return row ? { key: row.posterKey } : null;
    },
    write: async (client, id, key) => {
      await client.title.update({ where: { id }, data: { posterKey: key } });
    },
  },
  [ImageKind.SEASON_POSTER]: {
    rawKind: RawObjectKind.SEASON_POSTER,
    label: "Season",
    processedKey: (ownerId, version) => `posters/seasons/${ownerId}/${version}.webp`,
    read: async (client, id) => {
      const row = await client.season.findUnique({ where: { id }, select: { posterKey: true } });
      return row ? { key: row.posterKey } : null;
    },
    write: async (client, id, key) => {
      await client.season.update({ where: { id }, data: { posterKey: key } });
    },
  },
  [ImageKind.ARTIST_PHOTO]: {
    rawKind: RawObjectKind.ARTIST_PHOTO,
    label: "Artist",
    processedKey: (ownerId, version) => `posters/artists/${ownerId}/${version}.webp`,
    read: async (client, id) => {
      const row = await client.artist.findUnique({ where: { id }, select: { photoKey: true } });
      return row ? { key: row.photoKey } : null;
    },
    write: async (client, id, key) => {
      await client.artist.update({ where: { id }, data: { photoKey: key } });
    },
  },
  [ImageKind.USER_AVATAR]: {
    rawKind: RawObjectKind.USER_AVATAR,
    label: "User",
    processedKey: (ownerId, version) => `avatars/${ownerId}/${version}.webp`,
    read: async (client, id) => {
      const row = await client.user.findUnique({ where: { id }, select: { avatarKey: true } });
      return row ? { key: row.avatarKey } : null;
    },
    write: async (client, id, key) => {
      await client.user.update({ where: { id }, data: { avatarKey: key } });
    },
  },
};
