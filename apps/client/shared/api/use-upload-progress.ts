"use client";

import { useCallback, useState } from "react";

export interface UploadProgress {
  percent: number;
  report: (percent: number) => void;
}

export function useUploadProgress(): UploadProgress {
  const [percent, setPercent] = useState(0);
  const report = useCallback((next: number) => setPercent(next), []);
  return { percent, report };
}

export function withUploadProgress<M extends { isPending: boolean }>(mutation: M, progress: UploadProgress) {
  const uploadProgress = mutation.isPending ? progress.percent : 0;
  return { ...mutation, uploadProgress, isUploading: mutation.isPending && uploadProgress > 0 };
}
