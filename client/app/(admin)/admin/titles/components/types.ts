import { TitleType } from "@/features/title/schemas/title";
import TranscodingStatus from "@/types/transcoding-status";

export interface TitlesPageFilters {
  search?: string;
  type?: TitleType | "";
  status?: TranscodingStatus | "";
  page?: number;
}
