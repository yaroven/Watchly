import Box from "@mui/material/Box";
import { useTranslations } from "next-intl";

interface SeasonTabItemProps {
  number: number;
  isActive: boolean;
  onClick: () => void;
}

export default function SeasonTabItem({ number, isActive, onClick }: SeasonTabItemProps) {
  const t = useTranslations("season");

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
        whiteSpace: "nowrap",
        borderRadius: "12px 12px 0 0",
        height: "44px",
        paddingInline: "20px",
        fontSize: "15px",
        fontWeight: 700,
        color: isActive ? "primary.contrastText" : "text.secondary",
        backgroundColor: isActive ? "primary.main" : "transparent",
        transition: "background-color .15s ease-out, color .15s ease-out",
        ":hover": { color: isActive ? "primary.contrastText" : "text.primary" },
      }}
    >
      {t("tab", { number })}
    </Box>
  );
}
