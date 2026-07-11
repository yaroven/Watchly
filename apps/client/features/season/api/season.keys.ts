const seasonKeys = {
  all: () => ["seasons"] as const,
  lists: () => [...seasonKeys.all(), "list"] as const,
  list: (titleId: string) => [...seasonKeys.lists(), titleId] as const,
  details: () => [...seasonKeys.all(), "detail"] as const,
  detail: (id: string) => [...seasonKeys.details(), id] as const,
};

export default seasonKeys;
