import { VideoType } from "../../queues/video-transcoder/enums/video-type.enum";
import { buildRawKey, RawObjectKind } from "../../s3/raw-key";

const RAW_KINDS: Record<VideoType, RawObjectKind> = {
  [VideoType.MOVIE]: RawObjectKind.TITLE_VIDEO,
  [VideoType.EPISODE]: RawObjectKind.EPISODE_VIDEO,
};

const VIDEO_TYPES: Partial<Record<RawObjectKind, VideoType>> = {
  [RawObjectKind.TITLE_VIDEO]: VideoType.MOVIE,
  [RawObjectKind.EPISODE_VIDEO]: VideoType.EPISODE,
};

export function rawVideoKey(id: string, type: VideoType): string {
  return buildRawKey({ kind: RAW_KINDS[type], ownerId: id });
}

export function videoTypeOfRawKind(kind: RawObjectKind): VideoType | undefined {
  return VIDEO_TYPES[kind];
}
