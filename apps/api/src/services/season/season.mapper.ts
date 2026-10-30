import { Season } from "@prisma/client";
import { SeasonView } from "./season.types";

export const toSeasonView = (season: Season, posterUrl: string | null): SeasonView => ({
  id: season.id,
  createdAt: season.createdAt,
  updatedAt: season.updatedAt,
  number: season.number,
  name: season.name,
  description: season.description,
  posterUrl,
  titleId: season.titleId,
});
