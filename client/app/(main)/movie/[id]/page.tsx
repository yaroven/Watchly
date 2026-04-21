import CustomVideoPlayer from "@/features/player/components/CustomVideoPlayer";
import TitleService from "@/features/title/api/title.service";
import TitleInfo from "@/features/title/components/TitleInfo";
import { normalizeStreamUrl } from "@/shared/lib/normalize-stream-url";
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
  let fixedUrl = "";

  try {
    title = await TitleService.getById(id);
    const movieUrl = await TitleService.getStreamUrl(id);
    fixedUrl = normalizeStreamUrl(movieUrl);
  } catch (error) {
    console.error("Failed to fetch movie details", error);
    return notFound();
  }

  return (
    <div className={styles.container}>
      <JsonLd data={title} />
      <TitleInfo id={id} initialData={title} />
      <div className={styles.playerShell}>
        <CustomVideoPlayer src={fixedUrl} />
      </div>
    </div>
  );
}
