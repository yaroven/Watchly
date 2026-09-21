import Box from "@mui/material/Box";

interface SeasonTabItemProps {
  number: number;
  isActive: boolean;
  onClick: () => void;
}

export default function SeasonTabItem({ number, isActive, onClick }: SeasonTabItemProps) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-current={isActive ? "true" : undefined}
      sx={{
        border: "none",
        font: "inherit",
        cursor: "pointer",
        borderRadius: "12px 12px 0 0",
        height: "44px",
        paddingInline: "24px",
        fontSize: "16px",
        fontWeight: 700,
        color: isActive ? "#191919" : "#999999",
        backgroundColor: isActive ? "#ffffff" : "transparent",
        transition: "background-color .15s ease-out, color .15s ease-out",
        ":hover": { color: isActive ? "#191919" : "#ffffff" },
      }}
    >
      season {number}
    </Box>
  );
}
