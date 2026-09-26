export interface Genre {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
}

export interface GetAllGenresDto {
  page?: number;
  limit?: number;
}
