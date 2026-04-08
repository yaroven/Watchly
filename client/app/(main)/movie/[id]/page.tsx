import CustomVideoPlayer from "@/app/components/shared/CustomVideoPlayer";
import JsonLd from "@/app/components/shared/JsonLd";
import TitleInfo from "@/app/components/ui/TitleInfo";
import { TitleService } from "@/app/services/title.service";
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
    fixedUrl = movieUrl.replace("localstack", "localhost");
  } catch (error) {
    console.error("Failed to fetch movie details", error);
    return notFound();
  }

  return (
    <div className={styles.container}>
      <JsonLd data={title} />
      <TitleInfo id={id} initialData={title} />
      <CustomVideoPlayer src={fixedUrl} />
    </div>
  );
}
