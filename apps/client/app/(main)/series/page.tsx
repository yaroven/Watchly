import Catalog from "@/features/title/components/Catalog";
import { TitleType } from "@/features/title/schemas/title";

export default function SeriesPage() {
  return (
    <Catalog
      type={TitleType.SERIES}
      eyebrow="Series hub"
      title="Binge-ready shows with cleaner navigation"
      description="Explore seasons and episodes from a catalog that now matches the modern tone and structure of the admin side."
    />
  );
}
