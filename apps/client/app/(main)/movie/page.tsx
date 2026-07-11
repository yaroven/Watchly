import Catalog from "@/features/title/components/Catalog";
import { TitleType } from "@/features/title/schemas/title";

export default function MoviePage() {
  return (
    <Catalog
      type={TitleType.MOVIE}
      eyebrow="Movie vault"
      title="Feature films in one streamlined shelf"
      description="Browse the movie catalog in a denser, more editorial layout with clearer hierarchy and faster paths into playback."
    />
  );
}
