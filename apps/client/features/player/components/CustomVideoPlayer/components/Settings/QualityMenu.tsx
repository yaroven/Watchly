import Box from "@mui/material/Box";

import { usePlayerQuality } from "../../CustomVideoPlayerContext";
import { getQualityOptionLabel } from "../../utils";

interface QualityMenuProps {
  onSelect: (level: number) => void;
}

const menuOptionSx = {
  border: 0,
  background: "transparent",
  textAlign: "left",
  padding: "10px 16px",
  color: "rgba(255, 255, 255, 0.8)",
  cursor: "pointer",
  fontSize: "13.5px",
  fontWeight: 500,
  borderRadius: "8px",
  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  whiteSpace: "nowrap",
  "&:hover": { background: "rgba(255, 255, 255, 0.08)", color: "#fff" },
  "&:focus-visible": { outline: "2px solid #e7bc0f", outlineOffset: "-2px" },
};

const menuOptionActiveSx = {
  color: "#e7bc0f",
  background: "rgba(231, 188, 15, 0.12)",
  fontWeight: 600,
};

export default function QualityMenu({ onSelect }: QualityMenuProps) {
  const { selected, options, currentLevel } = usePlayerQuality();

  if (!options.length) return <Box sx={menuOptionSx}>Auto</Box>;

  return options.map((option) => {
    const isActive = selected === option.level;

    return (
      <Box
        key={option.level}
        component="button"
        type="button"
        onClick={() => onSelect(option.level)}
        aria-pressed={isActive}
        sx={[menuOptionSx, isActive && menuOptionActiveSx]}
      >
        {getQualityOptionLabel(option, options, currentLevel)}
      </Box>
    );
  });
}
