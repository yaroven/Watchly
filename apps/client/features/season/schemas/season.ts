import type { useTranslations } from "next-intl";
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

type SeasonTranslator = ReturnType<typeof useTranslations<"season">>;

export const createSeasonFormSchema = (t: SeasonTranslator) =>
  z.object({
    number: z
      .number({
        error: t("validation.numberRequired"),
      })
      .int(t("validation.numberInteger"))
      .positive(t("validation.numberPositive")),
    name: z.string().trim().min(1, t("validation.nameRequired")),
    description: z.string().trim().max(500, t("validation.descriptionTooLong")),
    posterFile: z
      .custom<FileList | undefined>((value) => value === undefined || value instanceof FileList)
      .optional()
      .refine((fileList) => !fileList?.[0] || fileList[0].type.startsWith("image/"), {
        message: t("validation.posterType"),
      }),
  });

export type SeasonFormValues = z.infer<ReturnType<typeof createSeasonFormSchema>>;

export interface CreateSeasonDto {
  number: number;
  name: string;
  description: string;
  titleId: string;
}

export interface UpdateSeasonDto {
  number: number;
  name: string;
  description: string;
  titleId: string;
}
