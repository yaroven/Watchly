import notFoundImage from "@/public/404.png";
import { APP } from "@/shared/lib/routes";
import { Box } from "@mui/material";
import Typography from "@mui/material/Typography";
import Button from "@shared/ui/Button";
import Image from "next/image";

export default function PageNotFound() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh", py: "48px" }}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: "48px", alignItems: "center" }}>
        <Typography sx={{ color: "primary.main", fontSize: "18px" }}>Oops! The page you&#39;re looking for cannot be found.</Typography>
        <Image src={notFoundImage} alt="" />
        <Button variant="outlined" sx={{ fontWeight: "700", fontSize: "20px", px: "41px", py: "9px" }} href={APP.DISCOVER}>
          Go Home
        </Button>
      </Box>
    </Box>
  );
}
