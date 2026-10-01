/**
 * One square size. An avatar is rendered at 48px and 36px today, so 256 covers
 * a 3x display with room to spare and anything larger is bytes nobody sees.
 */
export const AVATAR_SIZE_PX = 256;

/** webp at this quality is visually clean for a photo at this size. */
export const AVATAR_WEBP_QUALITY = 80;

export const AVATAR_CONTENT_TYPE = "image/webp";

/** Rejected before a presigned URL is handed out; the worker checks the real bytes again. */
export const AVATAR_ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Generous for a photo straight off a phone, small enough to bound the worker. */
export const AVATAR_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
