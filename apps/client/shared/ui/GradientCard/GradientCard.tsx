"use client";

import type { BoxProps } from "@mui/material/Box";
import Box from "@mui/material/Box";

interface GradientCardProps extends BoxProps {
  interactive?: boolean;
  radius?: number;
}

export default function GradientCard({ interactive = false, radius = 20, sx, children, ...rest }: GradientCardProps) {
  return (
    <Box
      sx={[
        {
          position: "relative",
          borderRadius: `${radius}px`,
          border: "1px solid transparent",
          background:
            "linear-gradient(180deg, #2b2b2b 0%, #191919 100%) padding-box, linear-gradient(180deg, #666666 0%, rgba(102,102,102,0) 100%) border-box",
          transition: "transform .15s ease-out, border-color .15s ease-out",
          ...(interactive && {
            cursor: "pointer",
            ":hover": {
              transform: "translateY(-2px)",
              background:
                "linear-gradient(180deg, #2b2b2b 0%, #191919 100%) padding-box, linear-gradient(180deg, #e7bc0f 0%, rgba(231,188,15,0) 100%) border-box",
            },
          }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {children}
    </Box>
  );
}
