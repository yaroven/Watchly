import { MovieDetails } from "@features/title";
import TitleService from "@features/title/api/title.service";
import { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const title = await TitleService.getById(id);
    return {
      title: `${title.name} | Watchly`,
      description: title.description,
    };
  } catch {
    return {
      title: "Movie | Watchly",
    };
  }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  let title: Awaited<ReturnType<typeof TitleService.getById>>;
  let movieUrl = "";

  try {
    title = await TitleService.getById(id);
    movieUrl = await TitleService.getStreamUrl(id);
  } catch (error) {
    console.error("Failed to fetch movie details", error);
    return notFound();
  }

  return <MovieDetails title={title} streamUrl={movieUrl} />;
}
