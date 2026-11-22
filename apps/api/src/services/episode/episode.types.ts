import { Episode, EpisodeTranslation, TranscodingStatus } from "@prisma/client";
import { ContentLocaleView } from "../../common/utils/localize.util";

export interface EpisodeInput {
  number: number;
  name: string;
  description: string;
  seasonId: string;
}

export type EpisodeUpdate = Omit<EpisodeInput, "seasonId">;

export interface EpisodeView {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  number: number;
  name: string;
  description: string;
  seasonId: string;
  transcodingStatus: TranscodingStatus;
  content: ContentLocaleView;
}

export type EpisodeWithTranslations = Episode & { translations?: EpisodeTranslation[] };
