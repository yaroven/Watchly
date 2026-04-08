import { TitleService } from "@/app/services/title.service";
import { TitleType } from "@/app/types/title";
import AdminTitlesClient from "./AdminTitlesClient";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    type?: string;
    page?: string;
  }>;
}

export default async function Page({ searchParams }: PageProps) {
  const { search, type, page } = await searchParams;

  const searchString = search || "";
  const typeFilter = (type as TitleType) || undefined;
  const currentPage = Number(page) || 1;
  const limit = 12;

  const initialData = await TitleService.getAll({
    searchString,
    page: currentPage,
    limit,
    type: typeFilter,
  });

  return (
    <AdminTitlesClient
      initialData={initialData}
      initialFilters={{
        searchString,
        type: typeFilter || "",
        page: currentPage,
      }}
    />
  );
}
