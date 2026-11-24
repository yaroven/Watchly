"use client";

import Tooltip from "@mui/material/Tooltip";
import Typography, { type TypographyProps } from "@mui/material/Typography";
import { type ElementType, type MouseEvent, useState } from "react";

interface TruncatedTextProps extends Omit<TypographyProps, "children" | "noWrap" | "onMouseEnter"> {
  children: string;
  component?: ElementType;
  lines?: number;
}

const clampSx = (lines: number) =>
  lines === 1
    ? ({ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const)
    : ({
        display: "-webkit-box",
        overflow: "hidden",
        overflowWrap: "anywhere",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: lines,
      } as const);

export default function TruncatedText({ children, lines = 1, sx, ...rest }: TruncatedTextProps) {
  const [truncated, setTruncated] = useState(false);

  const measure = ({ currentTarget }: MouseEvent<HTMLElement>) =>
    setTruncated(currentTarget.scrollWidth > currentTarget.clientWidth || currentTarget.scrollHeight > currentTarget.clientHeight);

  return (
    <Tooltip title={truncated ? children : null}>
      <Typography {...rest} onMouseEnter={measure} sx={[clampSx(lines), ...(Array.isArray(sx) ? sx : [sx])]}>
        {children}
      </Typography>
    </Tooltip>
  );
}
