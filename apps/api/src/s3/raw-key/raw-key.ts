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

export function buildVideoRawKey(id: string, type: VideoType): string {
  return buildRawKey({ kind: videoKind(type), ownerId: id });
}
