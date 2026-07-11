import { z } from "zod";

export interface Season {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  number: number;
  name: string;
  description: string;
  posterUrl?: string;
  titleId: string;
  episodes: string[];
}

export const SeasonFormSchema = z.object({
  number: z
    .number({
      error: "Season number is required",
    })
    .int("Season number must be an integer")
    .positive("Season number must be greater than 0"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().max(500, "Description is too long"),
  posterFile: z
    .custom<FileList | undefined>((value) => value === undefined || value instanceof FileList)
    .optional()
    .refine((fileList) => !fileList?.[0] || fileList[0].type.startsWith("image/"), {
      message: "Only image files are supported for posters",
    }),
});

export type SeasonFormValues = z.infer<typeof SeasonFormSchema>;

export interface CreateSeasonDto {
  number: number;
  name: string;
  description: string;
  titleId: string;
}

export interface UpdateSeasonDto {
  number?: number;
  name?: string;
  description?: string;
  posterUrl?: string;
}
