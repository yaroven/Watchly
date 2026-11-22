import TranscodingStatus from "@/types/transcoding-status";

interface SessionEpisode {
  id: string;
  number: number;
  transcodingStatus: TranscodingStatus;
}

const isPlayable = (episode: SessionEpisode) => episode.transcodingStatus === TranscodingStatus.COMPLETED;
const inOrder = <T extends SessionEpisode>(episodes: readonly T[]) => [...episodes].sort((a, b) => a.number - b.number);

export function startEpisode<T extends SessionEpisode>(episodes: readonly T[], requestedId?: string | null): T | undefined {
  const requested = requestedId ? episodes.find((episode) => episode.id === requestedId) : undefined;
  if (requested) return requested;
  const ordered = inOrder(episodes);
  return ordered.find(isPlayable) ?? ordered[0];
}

export function nextEpisode<T extends SessionEpisode>(episodes: readonly T[], currentId: string): T | undefined {
  const ordered = inOrder(episodes);
  const index = ordered.findIndex((episode) => episode.id === currentId);
  if (index === -1) return undefined;
  return ordered.slice(index + 1).find(isPlayable);
}
