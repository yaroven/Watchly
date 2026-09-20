import TitleForm from "@/features/title/components/TitleForm";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import GradientCard from "@shared/ui/GradientCard";

export default function TitleCreate() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "28px", padding: { xs: "24px 16px 40px", md: "40px 36px 56px" } }}>
      <Box>
        <Typography component="h1" variant="h2" sx={{ color: "#ffffff" }}>
          Create Title
        </Typography>
        <Typography sx={{ mt: "14px", maxWidth: "680px", color: "text.secondary" }}>
          Add a new movie or series to the library and prepare it for publishing.
        </Typography>
      </Box>

      <GradientCard sx={{ width: "100%" }}>
        <Box sx={{ px: "28px", pt: "24px" }}>
          <Typography component="h2" variant="h4" sx={{ color: "#ffffff" }}>
            Title Details
          </Typography>
          <Typography sx={{ mt: "8px", color: "text.secondary" }}>
            Fill in the core metadata and upload the source file for movies.
          </Typography>
        </Box>

        <Box sx={{ borderBottom: "1px solid", borderColor: "divider", mt: "20px" }} />

        <Box sx={{ p: "28px" }}>
          <TitleForm />
        </Box>
      </GradientCard>
    </Box>
  );
}
