import { TranslationLocale } from "../../common/locale.const";
import { ContentLocaleView } from "../../common/utils/localize.util";
import { ArtistView } from "../artist/artist.types";

export type CharacterTranslations = Partial<Record<TranslationLocale, string>>;

export interface CastCreditInput {
  artistId: string;
  character?: string;
  characterTranslations?: CharacterTranslations;
  order?: number;
}

export interface CastCreditView {
  id: string;
  character: string | null;
  characterTranslations: CharacterTranslations;
  order: number;
  artist: ArtistView;
  content: ContentLocaleView;
}
