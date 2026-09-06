"use client";

import { Box, Divider } from "@mui/material";
import Typography from "@mui/material/Typography";
import { IMDB } from "@shared/assets/icons";
import Button from "@shared/ui/Button";
import CustomIcon from "@shared/ui/CustomIcon";
import SliderArrows from "@shared/ui/SliderArrows";
import { Fragment, useState } from "react";

export interface SliderTitle {
  id: string;
  title: string;
  description: string;
  score: string;
  backdropUrl: string;
  watchLink: string;
  trailerLink?: string;
  genres: string[];
}

interface HeroSliderProps {
  titles: SliderTitle[];
}

export default function HeroSlider({ titles }: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<-1 | 1>(1);

  if (!titles.length) return null;

  // Wraps around, so the hero keeps cycling in both directions.
  const go = (step: -1 | 1) => {
    setDirection(step);
    setIndex((current) => (current + step + titles.length) % titles.length);
  };

  const slide = titles[index];

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        flexGrow: 1,
        width: "100%",
        // 400 is the 1440-wide design; wider screens get proportionally taller.
        height: { xs: 280, sm: 340, lg: 400, xl: 480, xxl: 560 },
        backgroundColor: "#111111",
        borderRadius: "20px",
        p: "15px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "end",
      }}
    >
      {/* background-image cannot be transitioned, so the backdrop gets its own
          layer and the new picture fades in on top of the old one. */}
      <Box
        key={slide.backdropUrl}
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(0,0,0,.2), rgba(0,0,0,.2)), url(${slide.backdropUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          animation: "heroBackdropIn .45s ease-out",
          "@keyframes heroBackdropIn": {
            from: { opacity: 0, transform: "scale(1.04)" },
            to: { opacity: 1, transform: "scale(1)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      />
      <Box
        key={slide.id}
        sx={{
          position: "relative",
          background: "rgba(0, 0, 0, 0.6)",
          animation: `${direction > 0 ? "heroEnterRight" : "heroEnterLeft"} .35s ease-out`,
          "@keyframes heroEnterRight": {
            from: { opacity: 0, transform: "translateX(24px)" },
            to: { opacity: 1, transform: "translateX(0)" },
          },
          "@keyframes heroEnterLeft": {
            from: { opacity: 0, transform: "translateX(-24px)" },
            to: { opacity: 1, transform: "translateX(0)" },
          },
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          width: { xs: "100%", sm: 360, lg: 405, xl: 480, xxl: 560 },
          height: { xs: "auto", sm: 240, lg: 265, xl: 300, xxl: 340 },
          px: { xs: "20px", lg: "30px", xl: "36px" },
          py: { xs: "16px", lg: "11px" },
          backdropFilter: "blur(12px)",
          borderRadius: "20px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h1" sx={{ fontSize: "clamp(24px, 2.2vw, 44px)", mb: "6px" }}>
          {slide.title}
        </Typography>

        <Box sx={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 700, display: "flex", gap: "4px", alignItems: "center" }}>
            <CustomIcon icon={IMDB} sx={{ fontSize: "32px" }} />
            {slide.score}
          </Typography>
          <Box sx={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
            {slide.genres.map((item, i) => (
              <Fragment key={item}>
                <Typography sx={{ fontSize: "14px", fontWeight: 300 }}>{item}</Typography>
                {i < slide.genres.length - 1 && (
                  <Divider
                    orientation="vertical"
                    flexItem={false}
                    sx={{
                      height: "6px",
                      borderRightWidth: "1px",
                      borderRadius: "100px",
                      alignSelf: "center",
                      borderColor: "primary.main",
                    }}
                  />
                )}
              </Fragment>
            ))}
          </Box>
        </Box>

        <Typography sx={{ fontSize: "clamp(12px, 0.85vw, 16px)" }}>{slide.description}</Typography>

        <Box sx={{ display: "flex", gap: "14px", px: "4px", mt: "auto" }}>
          <Button variant="contained" href={slide.watchLink} sx={{ fontWeight: 700, px: "44px", py: "8px" }}>
            Watch
          </Button>
          {slide.trailerLink && (
            <Button
              variant="outlined"
              href={slide.trailerLink}
              sx={{ fontWeight: 700, px: "48px", py: "8px", borderColor: "primary.main" }}
            >
              Trailer
            </Button>
          )}
        </Box>
      </Box>

      <SliderArrows onPrev={() => go(-1)} onNext={() => go(1)} itemLabel="title" sx={{ position: "relative", px: "7px", py: "4px" }} />
    </Box>
  );
}
