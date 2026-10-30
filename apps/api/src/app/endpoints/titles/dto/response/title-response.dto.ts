import { ApiProperty } from "@nestjs/swagger";
import { AgeRating, TitleType, TranscodingStatus } from "@prisma/client";
import { TitleView } from "../../../../../services/title/title.types";
import { GenreResponseDto } from "../../../genres/dto/response/genre-response.dto";
import { ExternalRatingResponseDto } from "./external-rating-response.dto";
import { TitleEngagementDto } from "./title-engagement.dto";

export class TitleResponseDto implements TitleView {
  @ApiProperty({ format: "uuid" })
  id: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: TitleType })
  type: TitleType;

  @ApiProperty()
  posterUrl: string | null;

  @ApiProperty({ enum: AgeRating })
  ageRating: AgeRating;

  @ApiProperty()
  country: string;

  @ApiProperty()
  releaseDate: Date;

  @ApiProperty()
  language: string;

  @ApiProperty()
  trailerUrl: string;

  @ApiProperty({ description: "Runtime in minutes" })
  runtime: number;

  @ApiProperty()
  network: string;

  @ApiProperty()
  director: string;

  @ApiProperty()
  closedCaption: boolean;

  @ApiProperty({ type: [GenreResponseDto] })
  genres: GenreResponseDto[];

  @ApiProperty({ enum: TranscodingStatus })
  transcodingStatus: TranscodingStatus;

  @ApiProperty({ type: [ExternalRatingResponseDto] })
  externalRatings: ExternalRatingResponseDto[];

  @ApiProperty({
    type: TitleEngagementDto,
    description:
      "Watchly's own score, likes, dislikes and watchlist state — the viewer's own included when signed in. Distinct from `externalRatings`, which are other sites' numbers.",
  })
  engagement: TitleEngagementDto;
}
