import notFoundImage from "@/public/404.png";
import { APP } from "@/shared/lib/routes";
import { Box } from "@mui/material";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function PageNotFound() {
  const t = useTranslations("pages.notFound");
  const tCommon = useTranslations("common");

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh", py: "48px" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "48px", alignItems: "center" }}>
        <Typography sx={{ color: "primary.main", fontSize: "18px" }}>{t("message")}</Typography>
        <Image src={notFoundImage} alt="" />
        <Button variant="outlined" sx={{ fontWeight: "700", fontSize: "20px", px: "41px", py: "9px" }} href={APP.DISCOVER}>
          {tCommon("goHome")}
        </Button>
      </Box>
    </Box>
  );
}
