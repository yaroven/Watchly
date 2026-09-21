"use client";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { IconButton } from "@mui/material";

const TOP = 110;
const WIDTH = 18;
const EXPANDED_WIDTH = WIDTH + 10;
const HEIGHT = 48;
const FILLET = 12;
const OUTER_RADIUS = FILLET + 4;
const SIDEBAR_BG = "#191919";
const BORDER_COLOR = "#6e6e6e";

const baseSx = {
  position: "absolute",
  top: `${TOP - HEIGHT / 2}px`,
  height: `${HEIGHT}px`,
  backgroundColor: SIDEBAR_BG,
  border: "1px solid",
  borderColor: BORDER_COLOR,
  zIndex: 3,
  color: "#ffffff",
  padding: 0,
  transition:
    "right 0.3s ease, border-radius 0.3s ease, width 0.3s ease, background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease",
  "&:hover": {
    backgroundColor: "#2a2a2a",
    borderColor: "primary.main",
    color: "primary.main",
    boxShadow: "0 0 8px rgba(231, 188, 15, 0.25)",
  },
  "&::before, &::after": {
    content: '""',
    position: "absolute",
    width: `${FILLET}px`,
    height: `${FILLET}px`,
    pointerEvents: "none",
    border: "none",
  },
};

// Collapsed: button pokes out past the (now icon-only) sidebar edge, chevron pointing right.
// The ::before/::after squares cut a concave notch into the button's top/bottom-left corners,
// so the sidebar's straight edge appears to curve inward around it.
const collapsedSx = {
  right: `-${WIDTH}px`,
  width: `${WIDTH}px`,
  borderRadius: `0 ${OUTER_RADIUS}px ${OUTER_RADIUS}px 0`,
  borderLeft: "none",
  "&::before": {
    left: 0,
    top: `-${FILLET}px`,
    borderBottomLeftRadius: `${FILLET}px`,
    boxShadow: `-${FILLET}px ${FILLET}px 0 0 ${SIDEBAR_BG}`,
  },
  "&::after": {
    left: 0,
    bottom: `-${FILLET}px`,
    borderTopLeftRadius: `${FILLET}px`,
    boxShadow: `-${FILLET}px -${FILLET}px 0 0 ${SIDEBAR_BG}`,
  },
};

// Expanded: same notch trick, mirrored onto the top/bottom-right corners, chevron pointing left.
const expandedSx = {
  right: "0px",
  width: `${EXPANDED_WIDTH}px`,
  borderRadius: `${OUTER_RADIUS}px 0 0 ${OUTER_RADIUS}px`,
  borderRight: "none",
  "&::before": {
    right: 0,
    top: `-${FILLET}px`,
    borderBottomRightRadius: `${FILLET}px`,
    boxShadow: `${FILLET}px ${FILLET}px 0 0 ${SIDEBAR_BG}`,
  },
  "&::after": {
    right: 0,
    bottom: `-${FILLET}px`,
    borderTopRightRadius: `${FILLET}px`,
    boxShadow: `${FILLET}px -${FILLET}px 0 0 ${SIDEBAR_BG}`,
  },
};

interface CollapseButtonProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function CollapseButton({ collapsed, onToggle }: CollapseButtonProps) {
  return (
    <IconButton
      onClick={onToggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      disableRipple
      sx={[baseSx, collapsed ? collapsedSx : expandedSx]}
    >
      <ChevronLeftIcon
        sx={{
          fontSize: 20,
          filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))",
          transition: "transform 0.3s ease",
          transform: collapsed ? "rotate(180deg)" : "none",
        }}
      />
    </IconButton>
  );
}
