"use client";

import { Season } from "@/app/types/season";
import { createContext, ReactNode, useContext } from "react";
import { useSeasonManager } from "../hooks/useSeasonManager";

type SeasonManagerContextType = ReturnType<typeof useSeasonManager>;

const SeasonManagerContext = createContext<SeasonManagerContextType | undefined>(undefined);

export const SeasonManagerProvider = ({
  titleId,
  seasons,
  children,
}: {
  titleId: string;
  seasons: Season[];
  children: ReactNode;
}) => {
  const value = useSeasonManager({ titleId, seasons });

  return <SeasonManagerContext.Provider value={value}>{children}</SeasonManagerContext.Provider>;
};

export const useSeasonManagerContext = () => {
  const context = useContext(SeasonManagerContext);
  if (!context) {
    throw new Error("useSeasonManagerContext must be used within a SeasonManagerProvider");
  }
  return context;
};
