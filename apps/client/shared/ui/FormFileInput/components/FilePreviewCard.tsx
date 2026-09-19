import { Delete as DeleteIcon, Description as DescriptionIcon, Edit as EditIcon } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { tokens } from "@shared/mui/theme";

interface FilePreviewCardProps {
  /** Id of the hidden file input the replace action opens. */
  inputId: string;
  fileUrl: string;
  fileName: string;
  isVideo: boolean;
  isImage: boolean;
  onRemove: () => void;
  hasError?: boolean;
  disabled?: boolean;
}

/** Filled state: preview, file name and the replace/remove actions. */
export default function FilePreviewCard({
  inputId,
  fileUrl,
  fileName,
  isVideo,
  isImage,
  onRemove,
  hasError = false,
  disabled = false,
}: FilePreviewCardProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        gap: "24px",
        background: tokens.surface.paper,
        borderRadius: "12px",
        border: `1px solid ${hasError ? tokens.feedback.error : tokens.border.subtle}`,
        p: "14px",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          width: "130px",
          height: "78px",
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: tokens.surface.fill,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          // Without this the raw <img>/<video> renders at its intrinsic size
          // and blows the card out.
          "& > video, & > img": { width: "100%", height: "100%", objectFit: "cover" },
        }}
      >
        {isVideo ? (
          <video src={fileUrl} preload="metadata" muted />
        ) : isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt={fileName || "Selected file preview"} />
        ) : (
          <DescriptionIcon sx={{ fontSize: "32px", color: tokens.text.placeholder }} />
        )}
      </Box>

      {/* minWidth: 0 lets the name shrink below its content width, which is
          what makes the ellipsis work inside a flex row. */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
        <Typography
          title={fileName}
          sx={{
            fontSize: "14px",
            fontWeight: 400,
            color: tokens.text.field,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {fileName}
        </Typography>
        <Box sx={{ display: "flex", gap: "12px" }}>
          <Box
            component="label"
            htmlFor={disabled ? undefined : inputId}
            aria-label="Replace file"
            sx={{
              ...actionSx,
              color: tokens.accent.primary,
              cursor: disabled ? "not-allowed" : "pointer",
              ...(disabled && { ":hover": { opacity: 0.75, transform: "none" } }),
            }}
          >
            <EditIcon sx={{ fontSize: "24px" }} />
          </Box>
          <Box
            component="button"
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Remove file"
            sx={{
              ...actionSx,
              color: tokens.feedback.error,
              border: "none",
              font: "inherit",
              ":disabled": { cursor: "not-allowed" },
            }}
          >
            <DeleteIcon sx={{ fontSize: "24px" }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/** Shared look for the replace/remove buttons. */
const actionSx = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  width: "36px",
  height: "36px",
  cursor: "pointer",
  borderRadius: "8px",
  background: tokens.surface.fill,
  opacity: 0.75,
  transition: "opacity .1s ease-in-out, transform .1s ease-in-out",
  ":hover": { opacity: 1, transform: "scale(1.1)" },
} as const;
