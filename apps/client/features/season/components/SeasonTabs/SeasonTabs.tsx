import { Season } from "@/features/season/schemas/season";
import Box from "@mui/material/Box";
import SeasonTabItem from "../SeasonTabItem";

interface SeasonTabsProps {
  seasons: Season[];
  currentSeasonId: string;
  onClick: (id: string) => void;
}

export default function SeasonTabs({ seasons, currentSeasonId, onClick }: SeasonTabsProps) {
  return (
    // No wrapping: the bar is docked above the episode card, so a second row would
    // grow upwards over the section above it. Long season lists scroll sideways.
    <Box sx={{ display: "flex", alignItems: "flex-end", maxWidth: "min(560px, 60vw)", overflowX: "auto", scrollbarWidth: "none" }}>
      {seasons.map(({ id, number }) => (
        <SeasonTabItem onClick={() => onClick(id)} key={id} number={number} isActive={id === currentSeasonId} />
      ))}
    </Box>
  );
}
