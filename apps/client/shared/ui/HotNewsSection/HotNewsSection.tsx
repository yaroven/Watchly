"use client";

import { Box } from "@mui/material";
import Typography from "@mui/material/Typography";
import { Verified } from "@shared/assets/icons";
import CustomIcon from "@shared/ui/CustomIcon";
import SliderArrows from "@shared/ui/SliderArrows";
import Image from "next/image";
import { useState } from "react";

export interface New {
  id: string;
  text: string;
  image: string;
  createdAt: Date;
}

interface HotNewsSectionProps {
  news: New[];
}

export default function HotNewsSection({ news }: HotNewsSectionProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<-1 | 1>(1);

  if (!news.length) return null;

  const go = (step: -1 | 1) => {
    setDirection(step);
    setIndex((current) => Math.min(Math.max(current + step, 0), news.length - 1));
  };

  const slide = news[index];
  const d = new Date(slide.createdAt);
  const month = d.toLocaleDateString("en-US", { month: "long" });

  return (
    <Box
      sx={{
        width: { xs: 260, lg: 300, xl: 360, xxl: 420 },
        flexShrink: 0,
        background: "transparent",
        position: "relative",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          bgcolor: "primary.main",
          borderRadius: "20px",
          transform: "rotate(-1.02deg)",
          zIndex: 1,
        },
      }}
    >
      <Box
        sx={{
          position: "relative",
          height: "100%",
          borderRadius: "20px",
          p: { xs: "14px", lg: "16px", xl: "20px", xxl: "24px" },
          background: "#000000",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Only the story itself animates; the heading, counter and arrows
            stay put. Remounting on id change restarts the animation. */}
        <Box
          key={slide.id}
          sx={{
            display: "contents",
            "& > *": {
              animation: `${direction > 0 ? "newsEnterRight" : "newsEnterLeft"} .3s ease-out`,
            },
            "@keyframes newsEnterRight": {
              from: { opacity: 0, transform: "translateX(16px)" },
              to: { opacity: 1, transform: "translateX(0)" },
            },
            "@keyframes newsEnterLeft": {
              from: { opacity: 0, transform: "translateX(-16px)" },
              to: { opacity: 1, transform: "translateX(0)" },
            },
            "@media (prefers-reduced-motion: reduce)": { "& > *": { animation: "none" } },
          }}
        >
          <Box sx={{ order: 1, mb: "32px", position: "relative", width: "100%", aspectRatio: "268 / 170" }}>
            {/* fill lets the image follow the panel width instead of staying
                at the 268px from the 1440-wide design. */}
            <Image
              src={slide.image}
              alt=""
              fill
              sizes="(max-width: 1200px) 260px, (max-width: 2200px) 360px, 420px"
              style={{ borderRadius: "12px", objectFit: "cover" }}
            />
          </Box>
          <Typography sx={{ order: 3, mb: "16px", fontSize: "clamp(13px, 0.95vw, 18px)", fontWeight: 300, whiteSpace: "pre-line" }}>
            {slide.text}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignContent: "center", gap: "8px", mb: "16px", order: 2 }}>
          <CustomIcon icon={Verified} />

          <Typography component={"h1"} sx={{ fontSize: "clamp(16px, 1.3vw, 26px)", fontWeight: 700, color: "primary.main" }}>
            Hot News
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            px: "8px",
            fontSize: "clamp(12px, 0.85vw, 16px)",
            mt: "auto",
            // Siblings above carry explicit order values, so this needs one too
            // — an unset order counts as 0 and would jump to the top.
            order: 4,
          }}
        >
          <Typography sx={{ color: "text.secondary" }}>
            {month} {d.getDate()}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <SliderArrows
              onPrev={() => go(-1)}
              onNext={() => go(1)}
              itemLabel="story"
              disablePrev={index === 0}
              disableNext={index === news.length - 1}
              size={18}
              sx={{ gap: "8px" }}
            />
            <Typography sx={{ fontSize: "clamp(12px, 0.85vw, 16px)" }}>
              {index + 1}/{news.length}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
