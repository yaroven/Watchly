import { TitleFormValues, TitleType } from "@/features/title/schemas/title";

export type ReadinessFieldKey =
  | "name"
  | "description"
  | "director"
  | "network"
  | "ageRating"
  | "genreIds"
  | "country"
  | "language"
  | "releaseDate"
  | "runtime"
  | "posterFile"
  | "trailerUrl"
  | "videoFile";

export type ReadinessSectionKey = "identity" | "classification" | "media";

export interface ReadinessItem {
  key: ReadinessFieldKey;
  done: boolean;
  anchor: string;
}

export interface ReadinessSection {
  key: ReadinessSectionKey;
  items: ReadinessItem[];
}

export interface TitleReadiness {
  sections: ReadinessSection[];
  doneCount: number;
  totalCount: number;
  missingKeys: ReadinessFieldKey[];
}

const filled = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value) && value > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof FileList !== "undefined" && value instanceof FileList) return value.length > 0;
  return Boolean(value);
};

export function getTitleReadiness(values: Partial<TitleFormValues>, { needsVideo }: { needsVideo: boolean }): TitleReadiness {
  const sections: ReadinessSection[] = [
    {
      key: "identity",
      items: [
        { key: "name", done: filled(values.name), anchor: "name" },
        { key: "description", done: filled(values.description), anchor: "description" },
        { key: "director", done: filled(values.director), anchor: "director" },
        { key: "network", done: filled(values.network), anchor: "network" },
      ],
    },
    {
      key: "classification",
      items: [
        { key: "ageRating", done: filled(values.ageRating), anchor: "field-ageRating" },
        { key: "genreIds", done: filled(values.genreIds), anchor: "section-classification" },
        { key: "country", done: filled(values.country), anchor: "country" },
        { key: "language", done: filled(values.language), anchor: "language" },
        { key: "releaseDate", done: filled(values.releaseDate), anchor: "releaseDate" },
        ...(values.type === TitleType.SERIES ? [] : [{ key: "runtime" as const, done: filled(values.runtime), anchor: "runtime" }]),
      ],
    },
    {
      key: "media",
      items: [
        { key: "posterFile", done: filled(values.posterFile), anchor: "section-media" },
        { key: "trailerUrl", done: filled(values.trailerUrl), anchor: "trailerUrl" },
        ...(needsVideo ? [{ key: "videoFile" as const, done: filled(values.videoFile), anchor: "section-media" }] : []),
      ],
    },
  ];

  const items = sections.flatMap((section) => section.items);

  return {
    sections,
    doneCount: items.filter((item) => item.done).length,
    totalCount: items.length,
    missingKeys: items.filter((item) => !item.done).map((item) => item.key),
  };
}
