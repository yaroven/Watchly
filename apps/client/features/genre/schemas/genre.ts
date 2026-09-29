export interface Genre {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  titleCount?: number;
}

export interface GetAllGenresDto {
  page?: number;
  limit?: number;
}

export interface CreateGenreDto {
  name: string;
}

export type UpdateGenreDto = CreateGenreDto;
