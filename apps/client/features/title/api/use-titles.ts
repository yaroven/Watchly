import { useViewer } from "@shared/lib/use-viewer";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { GetAllTitlesDto, Title } from "../schemas/title";
import titleKeys from "./title.keys";
import titleService from "./title.service";

const useTitles = (
  params: GetAllTitlesDto = {},
  options?: Omit<
    UseQueryOptions<{ items: Title[]; totalCount: number }, Error, { items: Title[]; totalCount: number }, readonly unknown[]>,
    "queryKey" | "queryFn"
  >,
) => {
  const { viewerKey } = useViewer();

  return useQuery({
    queryKey: titleKeys.listFor(params, viewerKey),
    queryFn: () => titleService.getAll(params),
    ...options,
  });
};

export default useTitles;
