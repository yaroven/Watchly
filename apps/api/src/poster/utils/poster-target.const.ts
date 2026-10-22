import { ImageKind } from "../../image-transcoder/image-profile.const";
import { RawObjectKind } from "../../s3/raw-key";

export type PosterEntityKind = "titles" | "seasons" | "artists";

export interface PosterTarget {
  imageKind: ImageKind;
  rawKind: RawObjectKind;
  label: string;
}

export const POSTER_TARGETS: Record<PosterEntityKind, PosterTarget> = {
  titles: {
    imageKind: ImageKind.TITLE_POSTER,
    rawKind: RawObjectKind.TITLE_POSTER,
    label: "Title",
  },
  seasons: {
    imageKind: ImageKind.SEASON_POSTER,
    rawKind: RawObjectKind.SEASON_POSTER,
    label: "Season",
  },
  artists: {
    imageKind: ImageKind.ARTIST_PHOTO,
    rawKind: RawObjectKind.ARTIST_PHOTO,
    label: "Artist",
  },
};

export const POSTER_ENTITY_KINDS = Object.keys(POSTER_TARGETS) as PosterEntityKind[];
