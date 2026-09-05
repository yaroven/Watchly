"use client";
import { TranscodingStatus } from "@/types";
import useTitles from "@features/title/api/use-titles";
import Catalog from "@features/title/components/Catalog";
import { TitleType } from "@features/title/schemas/title";

export default function Home() {
  const { data } = useTitles({
    page: 1,
    limit: 4,
    type: TitleType.SERIES,
    transcodingStatus: TranscodingStatus.COMPLETED,
  });
  return <Catalog title="A streaming storefront with admin-grade polish" items={data?.items || []} />;
}
