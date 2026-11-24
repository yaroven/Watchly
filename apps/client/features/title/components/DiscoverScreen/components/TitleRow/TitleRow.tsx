"use client";

import type { TitleType } from "@/features/title/schemas/title";
import { useRouter } from "@/i18n/navigation";
import { APP } from "@/shared/lib/routes";
import { TranscodingStatus } from "@/types";
import useTitles from "@features/title/api/use-titles";
import Catalog from "@features/title/components/Catalog";

const ROW_SIZE = 12;

interface TitleRowProps {
  heading: string;
  type: TitleType;
}

export default function TitleRow({ heading, type }: TitleRowProps) {
  const router = useRouter();
  const { data, isPending } = useTitles({ page: 1, limit: ROW_SIZE, type, transcodingStatus: TranscodingStatus.COMPLETED });
  const items = data?.items ?? [];

  if (!isPending && items.length === 0) return null;

  return <Catalog title={heading} bleed items={items} isLoading={isPending} onViewAll={() => router.push(APP.SEARCH({ type }))} />;
}
