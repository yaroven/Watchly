"use client";
import Box from "@mui/material/Box";
import Image from "next/image";

interface AvatarProps {
  src: string;
  alt: string;
}

export default function Avatar({ src, alt }: AvatarProps) {
  return (
    <Box sx={{ borderRadius: "100%", width: "48px", height: "48px", border: "1px solid", borderColor: "primary.main" }}>
      <Image width={48} height={48} src={src} alt={alt} />
    </Box>
  );
}
