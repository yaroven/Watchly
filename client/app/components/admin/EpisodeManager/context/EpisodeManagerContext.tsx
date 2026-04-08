"use client";

import { Episode } from "@/app/types/episode";
import { createContext, ReactNode, useContext } from "react";
import { useEpisodeManager } from "../hooks/useEpisodeManager";

type EpisodeManagerContextType = ReturnType<typeof useEpisodeManager>;

const EpisodeManagerContext = createContext<EpisodeManagerContextType | undefined>(undefined);

export const EpisodeManagerProvider = ({
  titleId,
  seasonId,
  episodes,
  children,
}: {
  titleId: string;
  seasonId: string;
  episodes: Episode[];
  children: ReactNode;
}) => {
  const value = useEpisodeManager({ titleId, seasonId, episodes });

  return <EpisodeManagerContext.Provider value={value}>{children}</EpisodeManagerContext.Provider>;
};

export const useEpisodeManagerContext = () => {
  const context = useContext(EpisodeManagerContext);
  if (!context) {
    throw new Error("useEpisodeManagerContext must be used within an EpisodeManagerProvider");
  }
  return context;
};
