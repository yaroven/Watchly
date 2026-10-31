import { PrismaService } from "../../prisma/prisma.service";
import { RawObjectKind } from "../../s3/raw-key";
import { ImageKind } from "../enums/image-kind.enum";
import { ImageProfile } from "../image.types";

export type ImageClient = Pick<PrismaService, "title" | "season" | "artist" | "user">;

export interface ImageTarget {
  profile: ImageProfile;
  rawKind: RawObjectKind;
  label: string;
  processedKey(ownerId: string, version: string): string;
  read(client: ImageClient, ownerId: string): Promise<{ key: string | null } | null>;
  write(client: ImageClient, ownerId: string, key: string | null): Promise<void>;
}

export const IMAGE_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const POSTER_ASPECT = { width: 600, height: 900 } as const;

export const IMAGE_TARGETS: Record<ImageKind, ImageTarget> = {
  [ImageKind.TITLE_POSTER]: {
    profile: {
      ...POSTER_ASPECT,
      format: "webp",
      quality: 82,
      contentType: "image/webp",
      maxUploadBytes: 15 * 1024 * 1024,
      allowedUploadTypes: IMAGE_UPLOAD_TYPES,
    },
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
    profile: {
      ...POSTER_ASPECT,
      format: "webp",
      quality: 82,
      contentType: "image/webp",
      maxUploadBytes: 15 * 1024 * 1024,
      allowedUploadTypes: IMAGE_UPLOAD_TYPES,
    },
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
    profile: {
      width: 400,
      height: 600,
      format: "webp",
      quality: 82,
      contentType: "image/webp",
      maxUploadBytes: 10 * 1024 * 1024,
      allowedUploadTypes: IMAGE_UPLOAD_TYPES,
    },
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
    profile: {
      width: 256,
      height: 256,
      format: "webp",
      quality: 80,
      contentType: "image/webp",
      maxUploadBytes: 10 * 1024 * 1024,
      allowedUploadTypes: IMAGE_UPLOAD_TYPES,
    },
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

export function imageProfile(kind: ImageKind): ImageProfile {
  return IMAGE_TARGETS[kind].profile;
}
