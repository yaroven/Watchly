import { Season, SeasonTranslation } from "@prisma/client";
import { ContentLocaleView } from "../../common/utils/localize.util";

export interface SeasonInput {
  number: number;
  name: string;
  description: string;
  titleId: string;
}

export interface SeasonView {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  number: number;
  name: string;
  description: string;
  posterUrl: string | null;
  titleId: string;
  content: ContentLocaleView;
}

export type SeasonWithTranslations = Season & { translations?: SeasonTranslation[] };
