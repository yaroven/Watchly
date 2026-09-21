"use client";

import { Season } from "@/features/season/schemas/season";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useSeasonManagerContext } from "../../context/SeasonManagerContext";

interface SeasonItemProps {
  season: Season;
  isSelected: boolean;
  onSelect: (seasonId: string) => void;
}

export default function SeasonItem({ season, isSelected, onSelect }: SeasonItemProps) {
  const { openEdit, openDelete } = useSeasonManagerContext();

  return (
    <Box
      onClick={() => onSelect(season.id)}
      sx={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 14px 10px 18px",
        borderRadius: "12px",
        cursor: "pointer",
        border: "1px solid",
        borderColor: isSelected ? "primary.main" : "#333333",
        backgroundColor: isSelected ? "rgba(231, 188, 15, 0.12)" : "rgba(255, 255, 255, 0.02)",
        transition: "background-color .15s ease-out, border-color .15s ease-out, transform .15s ease-out",
        "&:hover": {
          backgroundColor: isSelected ? "rgba(231, 188, 15, 0.16)" : "rgba(255, 255, 255, 0.05)",
          transform: "translateX(2px)",
        },
      }}
    >
      {isSelected && (
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "4px",
            backgroundColor: "primary.main",
            borderRadius: "0 6px 6px 0",
          }}
        />
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "30px",
            height: "20px",
            px: "6px",
            borderRadius: "6px",
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            fontSize: "11px",
            fontWeight: 700,
            color: "text.secondary",
          }}
        >
          #{season.number}
        </Box>
        <Typography sx={{ fontWeight: 500, color: "#ffffff" }}>{season.name}</Typography>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "2px",
          borderRadius: "999px",
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          padding: "2px",
        }}
      >
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            openEdit(season);
          }}
          sx={{ color: "text.secondary", "&:hover": { color: "#ffffff" } }}
        >
          <EditIcon sx={{ fontSize: 16 }} />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={(e) => {
            e.stopPropagation();
            openDelete(season);
          }}
        >
          <DeleteIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
