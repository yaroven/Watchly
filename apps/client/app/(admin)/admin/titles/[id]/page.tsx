import SeasonService from "@/features/season/api/season.service";
import type { Season } from "@/features/season/schemas/season";
import TitleService from "@/features/title/api/title.service";
import { TitleType } from "@/features/title/schemas/title";
import { notFound } from "next/navigation";
import TitleDetailsContent from "./TitleDetailsContent";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  let title: Awaited<ReturnType<typeof TitleService.getById>>;
  let seasons: Season[] = [];

  try {
    title = await TitleService.getById(id);
    if (!title) return notFound();

    if (title.type === TitleType.SERIES) seasons = await SeasonService.getAll(id);
  } catch (error) {
    console.error("Failed to fetch title details", error);
    return notFound();
  }

  return <TitleDetailsContent title={title} initialSeasons={seasons} />;
}
