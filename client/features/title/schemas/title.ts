import TranscodingStatus from "@/types/transcoding-status";
import { z } from "zod";

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
  transcodingStatus?: TranscodingStatus;
}

const PosterFileSchema = z
  .custom<FileList | undefined>((value) => value === undefined || value instanceof FileList)
  .optional();

export const BaseTitleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().max(500),
  type: z.enum(TitleType),
});

export const CreateTitleSchema = BaseTitleSchema.extend({
  videoFile: z.custom<FileList>().optional(),
  posterFile: PosterFileSchema,
})
  .refine(
    (data) => {
      if (!data.posterFile?.[0]) {
        return true;
      }

      return data.posterFile[0].type.startsWith("image/");
    },
    {
      message: "Only image files are supported for posters",
      path: ["posterFile"],
    },
  )
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
  posterFile: PosterFileSchema,
});

export type TitleFormValues = z.infer<typeof CreateTitleSchema>;

export interface CreateTitleDto {
  name: string;
  description: string;
  type: TitleType;
}

export interface UpdateTitleDto {
  name?: string;
  description?: string;
  type?: TitleType;
  posterUrl?: string;
  hlsUrl?: string;
}
