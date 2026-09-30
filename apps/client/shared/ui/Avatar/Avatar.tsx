"use client";
import Box from "@mui/material/Box";
import Image from "next/image";

interface AvatarProps {
  src: string;
  alt: string;
  size?: number;
}

export default function Avatar({ src, alt, size = 48 }: AvatarProps) {
  return (
    <Box
      sx={{
        position: "relative",
        flexShrink: 0,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "100%",
        // Without the clip a non-square source spills past the ring as a rectangle.
        overflow: "hidden",
        border: "1px solid",
        borderColor: "primary.main",
      }}
    >
      <Image fill sizes={`${size}px`} src={src} alt={alt} style={{ objectFit: "cover" }} />
    </Box>
  );
}
