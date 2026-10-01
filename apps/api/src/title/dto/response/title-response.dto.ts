import { ApiProperty } from "@nestjs/swagger";
import {
  AgeRating,
  ExternalRatings,
  Genre,
  Title,
  TitleType,
  TranscodingStatus,
} from "@prisma/client";
import { GenreResponseDto } from "../../../genre/dto/response/genre-response.dto";
import { TitleEngagementDto } from "../../../title-engagement/dto/response/title-engagement.dto";
import { ExternalRatingResponseDto } from "./external-rating-response.dto";

export class TitleResponseDto {
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
    description:
      "Watchly's own score — the mean of what viewers rated it, alongside the external ones",
  })
  rating: { average: number | null; count: number };

  @ApiProperty({
    type: TitleEngagementDto,
    description: "Likes, dislikes and watchlist state — the viewer's own included when signed in",
  })
  engagement: TitleEngagementDto;

  // Neither aggregate is defaulted: a title that nobody has rated or liked and a
  // title whose aggregates were never fetched would serialise identically, and
  // the client caches whichever it is handed.
  constructor(
    title: Title & { genres: Genre[]; externalRatings?: ExternalRatings[] },
    rating: { average: number | null; count: number },
    engagement: TitleEngagementDto,
    posterUrl: string | null = null,
  ) {
    this.id = title.id;
    this.createdAt = title.createdAt;
    this.updatedAt = title.updatedAt;
    this.name = title.name;
    this.description = title.description;
    this.type = title.type;
    // Derived from `title.posterKey` by the caller, never stored: a presigned
    // URL in a row keeps claiming it works after its signature expires.
    this.posterUrl = posterUrl;
    this.ageRating = title.ageRating;
    this.country = title.country;
    this.releaseDate = title.releaseDate;
    this.language = title.language;
    this.trailerUrl = title.trailerUrl;
    this.runtime = title.runtime;
    this.network = title.network;
    this.director = title.director;
    this.closedCaption = title.closedCaption;
    this.genres = title.genres.map((genre) => new GenreResponseDto(genre));
    this.transcodingStatus = title.transcodingStatus;
    this.rating = rating;
    this.engagement = engagement;
    this.externalRatings = (title.externalRatings ?? []).map(
      (rating) => new ExternalRatingResponseDto(rating),
    );
  }
}
