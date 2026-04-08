import Catalog from "@/app/components/ui/Catalog";
import { TitleType } from "@/app/types/title";

export default function SeriesPage() {
  return <Catalog type={TitleType.SERIES} />;
}
