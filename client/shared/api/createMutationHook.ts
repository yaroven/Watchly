import { QueryKey, useMutation, UseMutationOptions, useQueryClient } from "@tanstack/react-query";

type MutationConfig<TData, TVariables, TError = Error> = {
  mutationFn: (variables: TVariables) => Promise<TData>;
  getInvalidateKeys?: (variables: TVariables) => QueryKey[];
  getRemoveKeys?: (variables: TVariables) => QueryKey[];
  options?: Omit<UseMutationOptions<TData, TError, TVariables>, "mutationFn">;
};

export default function createMutationHook<TData, TVariables, TError = Error>({
  mutationFn,
  getInvalidateKeys,
  getRemoveKeys,
  options,
}: MutationConfig<TData, TVariables, TError>) {
  return (customOptions?: Omit<UseMutationOptions<TData, TError, TVariables>, "mutationFn">) => {
    const queryClient = useQueryClient();

    return useMutation({
      ...options,
      ...customOptions,
      mutationFn,
      onSuccess: (data, variables, onMutateResult, context) => {
        if (getInvalidateKeys) getInvalidateKeys(variables).forEach((key: QueryKey) => queryClient.invalidateQueries({ queryKey: key }));
        if (getRemoveKeys) getRemoveKeys(variables).forEach((key: QueryKey) => queryClient.removeQueries({ queryKey: key }));

        customOptions?.onSuccess?.(data, variables, onMutateResult, context);
      },
    });
  };
}
