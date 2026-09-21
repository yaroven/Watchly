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
    <Box sx={{ display: "flex", alignItems: "flex-end", flexWrap: "wrap" }}>
      {seasons.map(({ id, number }) => (
        <SeasonTabItem onClick={() => onClick(id)} key={id} number={number} isActive={id === currentSeasonId} />
      ))}
    </Box>
  );
}
