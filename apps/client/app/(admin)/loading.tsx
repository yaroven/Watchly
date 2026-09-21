import Box from "@mui/material/Box";
import Loader from "@shared/ui/Loader";

export default function Loading() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "70vh" }}>
      <Loader />
    </Box>
  );
}
