import { VideoType } from "../../queues/video-transcoder/enums/video-type.enum";
import { buildRawKey, RawObjectKind } from "../../s3/raw-key";

const RAW_KINDS: Record<VideoType, RawObjectKind> = {
  [VideoType.MOVIE]: RawObjectKind.TITLE_VIDEO,
  [VideoType.EPISODE]: RawObjectKind.EPISODE_VIDEO,
};

export function rawVideoKey(id: string, type: VideoType): string {
  return buildRawKey({ kind: RAW_KINDS[type], ownerId: id });
}
