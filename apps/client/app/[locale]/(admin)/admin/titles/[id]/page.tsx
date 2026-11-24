import type { Season } from "@features/season";
import { SeasonService } from "@features/season";
import { TitleDetails, TitleService, TitleType } from "@features/title";
import { BASE_CONTENT_LOCALE } from "@shared/lib/content-locale";
import { BaseContentScope } from "@shared/lib/content-locale-scope";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  let title: Awaited<ReturnType<typeof TitleService.getById>>;
  let seasons: Season[] = [];

  try {
    title = await TitleService.getById(id, BASE_CONTENT_LOCALE);
    if (!title) return notFound();

    if (title.type === TitleType.SERIES) seasons = await SeasonService.getAll(id, BASE_CONTENT_LOCALE);
  } catch (error) {
    console.error("Failed to fetch title details", error);
    return notFound();
  }

  return (
    <BaseContentScope>
      <TitleDetails title={title} initialSeasons={seasons} />
    </BaseContentScope>
  );
}
