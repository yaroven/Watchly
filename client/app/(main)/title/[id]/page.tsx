import TitleService from "@/features/title/api/title.service";
import { TitleType } from "@/features/title/schemas/title";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TitlePage({ params }: PageProps) {
  const { id } = await params;

  try {
    const title = await TitleService.getById(id);
    redirect(title.type === TitleType.MOVIE ? `/movie/${id}` : `/series/${id}`);
  } catch {
    notFound();
  }
}
