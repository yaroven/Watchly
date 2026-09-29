import { ArtistDetail } from "@/features/artist";
import ArtistService from "@/features/artist/api/artist.service";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  const artist = await ArtistService.getById(id).catch((error) => {
    console.error("Failed to fetch artist details", error);
    return null;
  });

  if (!artist) return notFound();

  return <ArtistDetail artist={artist} />;
}
