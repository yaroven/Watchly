export const episodeKeys = {
  all: (): string[] => ["episodes"] as const,
  lists: (): string[] => [...episodeKeys.all(), "list"] as const,
  list: (seasonId: string): string[] => [...episodeKeys.lists(), seasonId] as const,
  details: (): string[] => [...episodeKeys.all(), "detail"] as const,
  detail: (id: string): string[] => [...episodeKeys.details(), id] as const,
  stream: (id: string): string[] => [...episodeKeys.detail(id), "stream-url"] as const,
};
