import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Title } from "../schemas/title";
import titleKeys from "./title.keys";
import titleService from "./title.service";

const useTitle = (id: string, options?: Omit<UseQueryOptions<Title, Error, Title, readonly unknown[]>, "queryKey" | "queryFn">) => {
  return useQuery({
    queryKey: titleKeys.detail(id),
    queryFn: () => titleService.getById(id),
    ...options,
  });
};

export default useTitle;
