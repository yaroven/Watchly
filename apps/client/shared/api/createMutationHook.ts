import { type QueryClient, QueryKey, useMutation, UseMutationOptions, useQueryClient } from "@tanstack/react-query";

type MutationOptions<TData, TError, TVariables> = Omit<UseMutationOptions<TData, TError, TVariables>, "mutationFn">;

type MutationConfig<TData, TVariables, TError = Error> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  getInvalidateKeys?: (variables: TVariables) => QueryKey[];
  getRemoveKeys?: (variables: TVariables) => QueryKey[];
  options?: MutationOptions<TData, TError, TVariables>;
};

export default function createMutationHook<TData, TVariables, TError = Error>({
  mutationFn,
  getInvalidateKeys,
  getRemoveKeys,
  options,
}: MutationConfig<TData, TVariables, TError>) {
  return (customOptions?: MutationOptions<TData, TError, TVariables>) => {
    const queryClient = useQueryClient();

    return useMutation({
      ...options,
      ...customOptions,
      meta: { ...options?.meta, ...customOptions?.meta, callerHandlesError: Boolean(options?.onError || customOptions?.onError) },
      mutationFn,
      onSuccess: async (data, variables, onMutateResult, context) => {
        getRemoveKeys?.(variables).forEach((queryKey) => queryClient.removeQueries({ queryKey }));
        await refresh(queryClient, getInvalidateKeys?.(variables));

        await options?.onSuccess?.(data, variables, onMutateResult, context);
        await customOptions?.onSuccess?.(data, variables, onMutateResult, context);
      },
      onError: async (error, variables, onMutateResult, context) => {
        await refresh(queryClient, getInvalidateKeys?.(variables));

        await options?.onError?.(error, variables, onMutateResult, context);
        await customOptions?.onError?.(error, variables, onMutateResult, context);
      },
    });
  };
}

const refresh = (queryClient: QueryClient, keys: QueryKey[] | undefined) =>
  Promise.all((keys ?? []).map((queryKey) => queryClient.invalidateQueries({ queryKey })));
