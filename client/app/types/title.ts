import { z } from "zod";
import TranscodingStatus from "../enums/TranscodingStatus";

export enum TitleType {
  MOVIE = "MOVIE",
  SERIES = "SERIES",
}

export interface Title {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  description: string;
  type: TitleType;
  posterUrl?: string;
  hlsUrl?: string;
  seasons: string[];
  transcodingStatus: TranscodingStatus;
}

export interface GetAllTitlesDto {
  searchString?: string;
  page?: number;
  limit?: number;
  type?: TitleType;
}

export const BaseTitleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().max(500),
  posterUrl: z.url(),
  type: z.enum(TitleType),
});

export const CreateTitleSchema = BaseTitleSchema.extend({
  videoFile: z.custom<FileList>().optional(),
})
  .refine(
    (data) => {
      if (data.type === TitleType.MOVIE) {
        return data.videoFile && data.videoFile.length > 0;
      }
      return true;
    },
    {
      message: "Video file is required for Movies",
      path: ["videoFile"],
    },
  )
  .refine(
    (data) => {
      if (data.videoFile && data.videoFile.length > 0) {
        return data.videoFile[0].type.startsWith("video/");
      }
      return true;
    },
    {
      message: "Only video files are supported",
      path: ["videoFile"],
    },
  );

export const UpdateTitleSchema = BaseTitleSchema.partial().extend({
  videoFile: z.custom<FileList>().optional(),
});

export type CreateTitleDto = z.infer<typeof CreateTitleSchema>;
export type UpdateTitleDto = z.infer<typeof UpdateTitleSchema>;
