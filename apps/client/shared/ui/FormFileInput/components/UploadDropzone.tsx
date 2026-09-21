import { CloudUpload as CloudUploadIcon } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";

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
        backgroundColor: tokens.surface.dropzone,
        borderRadius: "12px",
        border: `1px dashed ${hasError ? tokens.feedback.error : tokens.border.faint}`,
        px: "20px",
        display: "flex",
        gap: "12px",
        justifyContent: "center",
        alignItems: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color .15s ease-in-out",
        ":hover": {
          borderColor: hasError ? tokens.feedback.error : disabled ? tokens.border.faint : tokens.accent.primary,
        },
      }}
    >
      <CloudUploadIcon sx={{ fontSize: "32px", color: hasError ? tokens.feedback.error : tokens.text.field }} />
      <Box>
        <Typography sx={{ fontSize: "16px", fontWeight: 400, color: tokens.text.field }}>Upload File</Typography>
        {hint && <Typography sx={{ fontSize: "12px", fontWeight: 400, color: tokens.text.placeholder }}>{hint}</Typography>}
      </Box>
    </Box>
  );
}
