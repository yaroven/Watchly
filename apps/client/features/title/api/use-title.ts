import { useViewer } from "@shared/lib/use-viewer";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Title } from "../schemas/title";
import titleKeys from "./title.keys";
import titleService from "./title.service";

const useTitle = (id: string, options?: Omit<UseQueryOptions<Title, Error, Title, readonly unknown[]>, "queryKey" | "queryFn">) => {
  const { viewerKey } = useViewer();

  return useQuery({
    queryKey: titleKeys.detailFor(id, viewerKey),
    queryFn: () => titleService.getById(id),
    ...options,
  });
};

export default useTitle;
