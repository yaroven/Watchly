import TranscodingStatus from "@/types/transcoding-status";
import type { ContentLocaleInfo, ContentTranslation } from "@shared/lib/content-locale";
import type { useTranslations } from "next-intl";
import { z } from "zod";

export const EPISODE_CONTENT_LIMITS = { name: 255, description: 2000 } as const;

export interface Episode {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  number: number;
  name: string;
  description: string;
  seasonId: string;
  transcodingStatus: TranscodingStatus;
  content: ContentLocaleInfo;
}

type EpisodesTranslator = ReturnType<typeof useTranslations<"episodes">>;

const createEpisodeBaseSchema = (t: EpisodesTranslator) =>
  z.object({
    number: z
      .number({
        error: t("validation.numberRequired"),
      })
      .int(t("validation.numberInteger"))
      .positive(t("validation.numberPositive")),
    name: z.string().trim().min(1, t("validation.nameRequired")).max(EPISODE_CONTENT_LIMITS.name, t("validation.nameTooLong")),
    description: z.string().trim().max(EPISODE_CONTENT_LIMITS.description, t("validation.descriptionTooLong")),
  });

const EpisodeVideoFileSchema = z.custom<FileList | undefined>((value) => value === undefined || value instanceof FileList).optional();

export const createCreateEpisodeFormSchema = (t: EpisodesTranslator) =>
  createEpisodeBaseSchema(t)
    .extend({
      videoFile: EpisodeVideoFileSchema,
    })
    .refine((data) => data.videoFile && data.videoFile.length > 0, {
      message: t("validation.videoRequired"),
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
        message: t("validation.videoType"),
        path: ["videoFile"],
      },
    );

export const createUpdateEpisodeFormSchema = createEpisodeBaseSchema;

export type CreateEpisodeFormValues = z.infer<ReturnType<typeof createCreateEpisodeFormSchema>>;
export type UpdateEpisodeFormValues = z.infer<ReturnType<typeof createUpdateEpisodeFormSchema>>;

export interface CreateEpisodeDto {
  number: number;
  name: string;
  description: string;
  seasonId: string;
  videoFile: FileList;
}

export type UpdateEpisodeDto = Omit<CreateEpisodeDto, "videoFile" | "seasonId">;

export interface EpisodeTranslationInput {
  name: string;
  description: string;
}

export type EpisodeTranslation = ContentTranslation<EpisodeTranslationInput>;

export const EPISODE_TRANSLATION_LIMITS = EPISODE_CONTENT_LIMITS;
