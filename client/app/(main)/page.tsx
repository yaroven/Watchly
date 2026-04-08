import Catalog from "@/app/components/ui/Catalog";
import { TitleService } from "../services/title.service";

interface HomeProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { page } = await searchParams;
  const currentPage = Number(page) || 1;
  const limit = 18;

  const initialData = await TitleService.getAll({ page: currentPage, limit });

  return <Catalog initialData={initialData} initialPage={currentPage} />;
}
