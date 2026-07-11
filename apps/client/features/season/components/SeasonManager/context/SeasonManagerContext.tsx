"use client";

import { Season } from "@/features/season/schemas/season";
import { createContext, ReactNode, useContext } from "react";
import { useSeasonManager } from "../hooks/useSeasonManager";

type SeasonManagerContextType = ReturnType<typeof useSeasonManager>;

const SeasonManagerContext = createContext<SeasonManagerContextType | undefined>(undefined);

export const SeasonManagerProvider = ({ seasons, titleId, children }: { seasons: Season[]; titleId: string; children: ReactNode }) => {
  const value = useSeasonManager({ seasons, titleId });

  return <SeasonManagerContext.Provider value={value}>{children}</SeasonManagerContext.Provider>;
};

export const useSeasonManagerContext = () => {
  const context = useContext(SeasonManagerContext);
  if (!context) {
    throw new Error("useSeasonManagerContext must be used within a SeasonManagerProvider");
  }
  return context;
};
