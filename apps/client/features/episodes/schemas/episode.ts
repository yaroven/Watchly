import TranscodingStatus from "@/types/transcoding-status";
import { z } from "zod";

export interface Episode {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  number: number;
  name: string;
  description: string;
  season: string;
  transcodingStatus: TranscodingStatus;
}

const EpisodeBaseSchema = z.object({
  number: z
    .number({
      error: "Episode number is required",
    })
    .int("Episode number must be an integer")
    .positive("Episode number must be greater than 0"),
  name: z.string().trim().min(1, "Name is required"),
  description: z.string().trim().max(500, "Description is too long"),
});

const EpisodeVideoFileSchema = z.custom<FileList | undefined>((value) => value === undefined || value instanceof FileList).optional();

export const CreateEpisodeFormSchema = EpisodeBaseSchema.extend({
  videoFile: EpisodeVideoFileSchema,
})
  .refine((data) => data.videoFile && data.videoFile.length > 0, {
    message: "Video file is required",
    path: ["videoFile"],
  })
  .refine(
    (data) => {
      if (!data.videoFile?.[0]) {
        return true;
      }

      return data.videoFile[0].type.startsWith("video/");
    },
    {
      message: "Only video files are supported",
      path: ["videoFile"],
    },
  );

export const UpdateEpisodeFormSchema = EpisodeBaseSchema;

export type CreateEpisodeFormValues = z.infer<typeof CreateEpisodeFormSchema>;
export type UpdateEpisodeFormValues = z.infer<typeof UpdateEpisodeFormSchema>;

export interface CreateEpisodeDto {
  number: number;
  name: string;
  description: string;
  seasonId: string;
  videoFile: FileList;
}

export type UpdateEpisodeDto = Partial<Omit<CreateEpisodeDto, "videoFile">>;
