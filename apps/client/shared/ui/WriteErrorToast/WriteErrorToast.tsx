"use client";

import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useApiErrorMessage } from "@shared/api/use-api-error-message";
import { useWriteErrorStore } from "@shared/api/write-errors";

export default function WriteErrorToast() {
  const error = useWriteErrorStore((state) => state.error);
  const shownAt = useWriteErrorStore((state) => state.shownAt);
  const dismiss = useWriteErrorStore((state) => state.dismiss);
  const describeError = useApiErrorMessage();
  const message = describeError(error);

  return (
    <Snackbar
      key={shownAt}
      open={!!message}
      autoHideDuration={7000}
      onClose={(_, reason) => reason !== "clickaway" && dismiss()}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      <Alert severity="error" variant="filled" onClose={dismiss} sx={{ alignItems: "center" }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
