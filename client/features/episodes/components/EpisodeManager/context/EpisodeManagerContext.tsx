"use client";

import { Episode } from "@/features/episodes/schemas/episode";
import { createContext, ReactNode, useContext } from "react";
import { useEpisodeManager } from "../hooks/useEpisodeManager";

type EpisodeManagerContextType = ReturnType<typeof useEpisodeManager>;

const EpisodeManagerContext = createContext<EpisodeManagerContextType | undefined>(undefined);

export const EpisodeManagerProvider = ({
  seasonId,
  episodes,
  children,
}: {
  seasonId: string;
  episodes: Episode[];
  children: ReactNode;
}) => {
  const value = useEpisodeManager({ seasonId, episodes });

  return <EpisodeManagerContext.Provider value={value}>{children}</EpisodeManagerContext.Provider>;
};

export const useEpisodeManagerContext = () => {
  const context = useContext(EpisodeManagerContext);
  if (!context) {
    throw new Error("useEpisodeManagerContext must be used within an EpisodeManagerProvider");
  }
  return context;
};
