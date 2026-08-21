import { CloudUpload as CloudUploadIcon } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface UploadDropzoneProps {
  /** Id of the hidden file input this label opens. */
  inputId: string;
  hint?: string;
  hasError?: boolean;
  disabled?: boolean;
}

/** Empty state: the dashed area shown until a file is picked. */
export default function UploadDropzone({ inputId, hint, hasError = false, disabled = false }: UploadDropzoneProps) {
  return (
    <Box
      component="label"
      // A <label> opens the input through its association, so the link itself
      // has to go when disabled — pointer styling alone would not stop it.
      htmlFor={disabled ? undefined : inputId}
      sx={{
        minHeight: "110px",
        backgroundColor: "#111111",
        borderRadius: "12px",
        border: `1px dashed ${hasError ? "#f64e34" : "#666666"}`,
        px: "20px",
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        alignItems: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color .15s ease-in-out",
        ":hover": { borderColor: hasError ? "#f64e34" : disabled ? "#666666" : "#e7bc0f" },
      }}
    >
      <CloudUploadIcon sx={{ fontSize: "32px", color: hasError ? "#f64e34" : "#e5e5e5" }} />
      <Box>
        <Typography sx={{ fontSize: "16px", fontWeight: 400, color: "#e5e5e5" }}>Upload File</Typography>
        {hint && <Typography sx={{ fontSize: "12px", fontWeight: 400, color: "#666666" }}>{hint}</Typography>}
      </Box>
    </Box>
  );
}
