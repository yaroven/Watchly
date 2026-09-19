import { Box } from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";

export type CornerPosition = "top left" | "top right" | "bottom left" | "bottom right";

interface InvertedCornerBoxProps {
  corners?: CornerPosition[];
  sx?: SxProps<Theme>;
  children?: React.ReactNode;
}

export default function InvertedCornerBox({
  corners = ["top left", "top right", "bottom left", "bottom right"],
  sx,
  children,
  ...props
}: InvertedCornerBoxProps) {
  const rawRadius = (sx as React.CSSProperties)?.borderRadius;
  const r = typeof rawRadius === "number" ? rawRadius : parseInt(String(rawRadius), 10) || 40;

  const hasTL = corners.includes("top left");
  const hasTR = corners.includes("top right");
  const hasBR = corners.includes("bottom right");
  const hasBL = corners.includes("bottom left");
  const clipPathString = `path("
    M ${hasTL ? r : 0} 0
    H calc(100% - ${hasTR ? r : 0}px)
    ${hasTR ? `A ${r} ${r} 0 0 0 100% ${r}px` : "L 100% 0"}
    V calc(100% - ${hasBR ? r : 0}px)
    ${hasBR ? `A ${r} ${r} 0 0 0 calc(100% - ${r}px) 100%` : "L 100% 100%"}
    H ${hasBL ? r : 0}px
    ${hasBL ? `A ${r} ${r} 0 0 0 0 calc(100% - ${r}px)` : "L 0 100%"}
    V ${hasTL ? r : 0}px
    ${hasTL ? `A ${r} ${r} 0 0 0 ${r} 0` : "L 0 0"}
    Z
  ")`;

  return (
    <Box
      sx={{
        clipPath: clipPathString,
        ...sx,
        borderRadius: 0,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
