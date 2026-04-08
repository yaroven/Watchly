import { VideoType } from "src/video-transcoder/enums/video-type.enum";

export class TranscodeVideoDto {
  id: string;
  type: VideoType;
}
