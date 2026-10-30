import { TranscodingStatus } from "@prisma/client";

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
}
