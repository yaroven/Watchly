import CustomVideoPlayer from "@/features/player/components/CustomVideoPlayer";
import TitleService from "@/features/title/api/title.service";
import TitleInfo from "@/features/title/components/TitleInfo";
import JsonLd from "@/shared/ui/JsonLd";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "./page.module.scss";

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

  return (
    <div className={styles.container}>
      <JsonLd data={title} />
      <TitleInfo title={title} />
      <div className={styles.playerShell}>
        <CustomVideoPlayer src={movieUrl} />
      </div>
    </div>
  );
}
