import { TitleFormValues, TitleType } from "@/features/title/schemas/title";

export interface ReadinessItem {
  key: string;
  label: string;
  done: boolean;
  anchor: string;
}

export interface ReadinessSection {
  key: string;
  label: string;
  items: ReadinessItem[];
}

export interface TitleReadiness {
  sections: ReadinessSection[];
  doneCount: number;
  totalCount: number;
  missingLabels: string[];
}

const filled = (value: unknown) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return !Number.isNaN(value) && value > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof FileList !== "undefined" && value instanceof FileList) return value.length > 0;
  return Boolean(value);
};

/** Live "what is still empty" view of the form — the rail's counter and the missing list read from this. */
export function getTitleReadiness(values: Partial<TitleFormValues>, { needsVideo }: { needsVideo: boolean }): TitleReadiness {
  const sections: ReadinessSection[] = [
    {
      key: "identity",
      label: "Identity",
      items: [
        { key: "name", label: "Name", done: filled(values.name), anchor: "name" },
        { key: "description", label: "Description", done: filled(values.description), anchor: "description" },
        { key: "director", label: "Director", done: filled(values.director), anchor: "director" },
        { key: "network", label: "Network", done: filled(values.network), anchor: "network" },
      ],
    },
    {
      key: "classification",
      label: "Format & classification",
      items: [
        { key: "ageRating", label: "Age rating", done: filled(values.ageRating), anchor: "field-ageRating" },
        { key: "genreIds", label: "Genres", done: filled(values.genreIds), anchor: "section-classification" },
        { key: "country", label: "Country", done: filled(values.country), anchor: "country" },
        { key: "language", label: "Language", done: filled(values.language), anchor: "language" },
        { key: "releaseDate", label: "Release date", done: filled(values.releaseDate), anchor: "releaseDate" },
        ...(values.type === TitleType.SERIES
          ? []
          : [{ key: "runtime", label: "Runtime", done: filled(values.runtime), anchor: "runtime" }]),
      ],
    },
    {
      key: "media",
      label: "Media",
      items: [
        { key: "posterFile", label: "Poster", done: filled(values.posterFile), anchor: "section-media" },
        { key: "trailerUrl", label: "Trailer URL", done: filled(values.trailerUrl), anchor: "trailerUrl" },
        ...(needsVideo ? [{ key: "videoFile", label: "Video file", done: filled(values.videoFile), anchor: "section-media" }] : []),
      ],
    },
  ];

  const items = sections.flatMap((section) => section.items);

  return {
    sections,
    doneCount: items.filter((item) => item.done).length,
    totalCount: items.length,
    missingLabels: items.filter((item) => !item.done).map((item) => item.label),
  };
}
