import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { CastCredit } from "../schemas/title";
import titleKeys from "./title.keys";
import titleService from "./title.service";

const useTitleCast = (
  id: string,
  options?: Omit<UseQueryOptions<CastCredit[], Error, CastCredit[], readonly unknown[]>, "queryKey" | "queryFn">,
) => {
  return useQuery({
    queryKey: titleKeys.cast(id),
    queryFn: () => titleService.getCast(id),
    ...options,
  });
};

export default useTitleCast;
