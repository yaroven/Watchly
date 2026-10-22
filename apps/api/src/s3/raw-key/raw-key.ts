import { ImageKind } from "../../image-transcoder/image-profile.const";
import { VideoType } from "../../video-transcoder/enums/video-type.enum";

export enum RawObjectKind {
  TITLE_VIDEO = "title-video",
  EPISODE_VIDEO = "episode-video",
  USER_AVATAR = "user-avatar",
  TITLE_POSTER = "title-poster",
  SEASON_POSTER = "season-poster",
  ARTIST_PHOTO = "artist-photo",
}

export interface RawObjectKey {
  kind: RawObjectKind;
  ownerId: string;
  name?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KINDS = new Set<string>(Object.values(RawObjectKind));

export function buildRawKey({ kind, ownerId, name }: RawObjectKey): string {
  return name ? `${kind}/${ownerId}/${name}` : `${kind}/${ownerId}`;
}

export function parseRawKey(key: string): RawObjectKey | null {
  const [kind, ownerId, ...rest] = key.split("/");

  if (!KINDS.has(kind) || !ownerId) return null;

  return {
    kind: kind as RawObjectKind,
    ownerId,
    ...(rest.length > 0 ? { name: rest.join("/") } : {}),
  };
}

export function isLegacyBareUuidKey(key: string): boolean {
  return UUID.test(key);
}

export function videoKind(type: VideoType): RawObjectKind {
  return type === VideoType.EPISODE ? RawObjectKind.EPISODE_VIDEO : RawObjectKind.TITLE_VIDEO;
}

const VIDEO_TYPES: Partial<Record<RawObjectKind, VideoType>> = {
  [RawObjectKind.TITLE_VIDEO]: VideoType.MOVIE,
  [RawObjectKind.EPISODE_VIDEO]: VideoType.EPISODE,
};

const IMAGE_KINDS: Partial<Record<RawObjectKind, ImageKind>> = {
  [RawObjectKind.USER_AVATAR]: ImageKind.USER_AVATAR,
  [RawObjectKind.TITLE_POSTER]: ImageKind.TITLE_POSTER,
  [RawObjectKind.SEASON_POSTER]: ImageKind.SEASON_POSTER,
  [RawObjectKind.ARTIST_PHOTO]: ImageKind.ARTIST_PHOTO,
};

export function videoTypeOf(kind: RawObjectKind): VideoType | undefined {
  return VIDEO_TYPES[kind];
}

export function imageKindOf(kind: RawObjectKind): ImageKind | undefined {
  return IMAGE_KINDS[kind];
}

export function buildVideoRawKey(id: string, type: VideoType): string {
  return buildRawKey({ kind: videoKind(type), ownerId: id });
}
