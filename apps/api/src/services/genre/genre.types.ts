export interface GenreInput {
  name: string;
}

export interface GenreView {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  titleCount?: number;
}
