"use client";

import { Episode } from "@/features/episodes/schemas/episode";
import { getEpisodeScore, getEpisodeThumbnail } from "@features/title/components/TitleOverview/mocks";
import Box from "@mui/material/Box";
import SliderArrows from "@shared/ui/SliderArrows";
import { useEffect, useRef, useState } from "react";
import EpisodeItem from "../EpisodeItem";

interface EpisodeListProps {
  episodes: Episode[];
  currentEpisodeId: string;
  onClick: (id: string) => void;
  posterUrl?: string;
}

export default function EpisodeList({ episodes, currentEpisodeId, onClick, posterUrl }: EpisodeListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [{ atStart, atEnd }, setScrollEdges] = useState({ atStart: true, atEnd: true });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateEdges = () => {
      setScrollEdges({ atStart: el.scrollLeft <= 0, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
    };

    updateEdges();
    el.addEventListener("scroll", updateEdges);
    const resizeObserver = new ResizeObserver(updateEdges);
    resizeObserver.observe(el);
    return () => {
      el.removeEventListener("scroll", updateEdges);
      resizeObserver.disconnect();
    };
  }, [episodes]);

  const scrollBy = (direction: 1 | -1) => {
    scrollRef.current?.scrollBy({ left: direction * 420, behavior: "smooth" });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Box
        ref={scrollRef}
        sx={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
          pb: "8px",
          scrollSnapType: "x proximity",
          "& > *": { scrollSnapAlign: "start" },
          scrollbarWidth: "thin",
          scrollbarColor: "#333333 transparent",
        }}
      >
        {episodes.map((episode) => (
          <EpisodeItem
            key={episode.id}
            onClick={() => onClick(episode.id)}
            number={episode.number}
            name={episode.name}
            transcodingStatus={episode.transcodingStatus}
            isActive={episode.id === currentEpisodeId}
            thumbnailUrl={getEpisodeThumbnail(episode.id, posterUrl)}
            score={getEpisodeScore(episode.number)}
          />
        ))}
      </Box>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <SliderArrows
          onPrev={() => scrollBy(-1)}
          onNext={() => scrollBy(1)}
          itemLabel="episode"
          shape="square"
          size={40}
          disablePrev={atStart}
          disableNext={atEnd}
        />
      </Box>
    </Box>
  );
}
