import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Title } from "../schemas/title";
import titleService from "./title.service";

const prefix = "title";

const useTitle = (
  id: string,
  options?: Omit<UseQueryOptions<Title, Error, Title, string[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: [prefix, id],
    queryFn: () => titleService.getById(id),
    ...options,
  });
};

export default useTitle;
