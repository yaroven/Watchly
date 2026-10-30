export interface SeasonInput {
  number: number;
  name: string;
  description: string;
  titleId: string;
}

export interface SeasonUpdate extends SeasonInput {
  posterUploaded?: boolean;
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
}
