import TitleService from "@/features/title/api/title.service";
import Catalog from "@/features/title/components/Catalog";

interface HomeProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const { page } = await searchParams;
  const currentPage = Number(page) || 1;
  const limit = 18;

  const initialData = await TitleService.getAll({ page: currentPage, limit });

  return (
    <Catalog
      initialData={initialData}
      initialPage={currentPage}
      eyebrow="Watchly premiere"
      title="A streaming storefront with admin-grade polish"
      description="Pick up a movie or series from a cleaner, more premium catalog built to feel as intentional as the dashboard behind it."
    />
  );
}
