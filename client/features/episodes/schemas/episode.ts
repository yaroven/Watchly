import TranscodingStatus from "@/types/transcoding-status";

export interface Episode {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  number: number;
  name: string;
  description: string;
  season: string;
  transcodingStatus: TranscodingStatus;
}

export interface CreateEpisodeDto {
  number: number;
  name: string;
  description: string;
  seasonId: string;
  videoFile: FileList;
}

export type UpdateEpisodeDto = Partial<Omit<CreateEpisodeDto, "videoFile">>;
