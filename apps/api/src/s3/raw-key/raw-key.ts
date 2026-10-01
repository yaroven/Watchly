import { VideoType } from "../../video-transcoder/enums/video-type.enum";

/**
 * What an object in the raw bucket is, encoded in its key.
 *
 * Before this, a raw key was the bare entity uuid and the consumer worked out
 * the type by probing the database — episode first, then title, and anything
 * that matched neither was dropped. That made the type a property of the rows
 * that happened to exist rather than of the upload, so a new kind of raw object
 * could not be told apart from a stale one.
 */
export enum RawObjectKind {
  TITLE_VIDEO = "title-video",
  EPISODE_VIDEO = "episode-video",
  USER_AVATAR = "user-avatar",
}

export interface RawObjectKey {
  kind: RawObjectKind;
  /** The entity the object belongs to. */
  ownerId: string;
  /** Present where one owner can have several raw objects over time. */
  name?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KINDS = new Set<string>(Object.values(RawObjectKind));

export function buildRawKey({ kind, ownerId, name }: RawObjectKey): string {
  return name ? `${kind}/${ownerId}/${name}` : `${kind}/${ownerId}`;
}

/**
 * Null for anything this build does not recognise — a key written by a newer
 * version, or the bare-uuid shape that predates the scheme. Callers decide what
 * to do with that; they must not guess.
 */
export function parseRawKey(key: string): RawObjectKey | null {
  const [kind, ownerId, ...rest] = key.split("/");

  if (!KINDS.has(kind) || !ownerId) return null;

  return {
    kind: kind as RawObjectKind,
    ownerId,
    ...(rest.length > 0 ? { name: rest.join("/") } : {}),
  };
}

/** True for a key in the pre-prefix shape: the entity uuid and nothing else. */
export function isLegacyBareUuidKey(key: string): boolean {
  return UUID.test(key);
}

export function videoKind(type: VideoType): RawObjectKind {
  return type === VideoType.EPISODE ? RawObjectKind.EPISODE_VIDEO : RawObjectKind.TITLE_VIDEO;
}

export function buildVideoRawKey(id: string, type: VideoType): string {
  return buildRawKey({ kind: videoKind(type), ownerId: id });
}
