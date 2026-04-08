import Catalog from "@/app/components/ui/Catalog";
import { TitleType } from "@/app/types/title";

export default function MoviePage() {
  return <Catalog type={TitleType.MOVIE} />;
}
