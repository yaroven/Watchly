export interface Season {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  number: number;
  name: string;
  description: string;
  posterUrl: string;
  titleId: string;
  episodes: string[];
}
export interface CreateSeasonDto {
  number: number;
  name: string;
  description: string;
  posterUrl: string;
  titleId: string;
}

export type UpdateSeasonDto = Partial<CreateSeasonDto>;
