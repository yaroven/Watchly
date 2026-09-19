import { Box } from "@mui/material";
import Typography from "@mui/material/Typography";
import InvertedCornerBox from "@shared/ui/InvertedCornerBox";

export default function TitleOverview() {
  return (
    <Box>
      <InvertedCornerBox
        corners={["bottom left", "bottom right"]}
        sx={{ background: "white", borderRadius: "8px", width: "418px", height: "700px" }}
      >
        <Typography>123</Typography>
      </InvertedCornerBox>
    </Box>
  );
}
