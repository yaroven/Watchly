import type { Title } from "@/features/title/schemas/title";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import { getTitleOverviewFixture } from "../TitleOverview/mocks";

interface StreamPhotosProps {
  title: Title;
}

const VISIBLE_COUNT = 9;

export default function StreamPhotos({ title }: StreamPhotosProps) {
  const { stream } = getTitleOverviewFixture(title.id);
  const visible = stream.photos.slice(0, VISIBLE_COUNT);
  const remaining = stream.photos.length - visible.length;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Typography variant="h3">Photos</Typography>
          <Typography sx={{ fontSize: "16px", color: "text.secondary" }}>{stream.photos.length}</Typography>
          <ChevronRightIcon sx={{ color: "text.secondary" }} />
        </Box>

        {/* PLACEHOLDER: no onClick — needs a photo-upload endpoint */}
        <Box
          component="button"
          type="button"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            border: "none",
            cursor: "pointer",
            borderRadius: "10px",
            backgroundColor: "primary.main",
            color: "#191919",
            fontWeight: 600,
            fontSize: "14px",
            px: "16px",
            py: "10px",
            font: "inherit",
          }}
        >
          <AddAPhotoIcon sx={{ fontSize: "18px" }} />
          Add Photo
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "12px",
        }}
      >
        {visible.map((photo, index) => (
          <Box key={photo} sx={{ position: "relative", aspectRatio: "1 / 1", borderRadius: "12px", overflow: "hidden" }}>
            <Image src={photo} alt="" fill sizes="200px" style={{ objectFit: "cover" }} />
            {index === visible.length - 1 && remaining > 0 && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0,.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ color: "#ffffff", fontSize: "18px", fontWeight: 600 }}>+{remaining}</Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}
