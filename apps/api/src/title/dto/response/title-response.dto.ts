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

  constructor(
    title: Title & { genres: Genre[]; externalRatings?: ExternalRatings[] },
    rating: { average: number | null; count: number } = { average: null, count: 0 },
  ) {
    this.id = title.id;
    this.createdAt = title.createdAt;
    this.updatedAt = title.updatedAt;
    this.name = title.name;
    this.description = title.description;
    this.type = title.type;
    this.posterUrl = title.posterUrl;
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
    this.externalRatings = (title.externalRatings ?? []).map(
      (rating) => new ExternalRatingResponseDto(rating),
    );
  }
}
