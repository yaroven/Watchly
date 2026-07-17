export const DEV_DEFAULTS = {
  REDIS_HOST: "localhost",
  REDIS_PORT: "6379",
  S3_ACCESS_KEY_ID: "localstack",
  S3_SECRET_ACCESS_KEY: "localstack",
  DATABASE_URL: "postgresql://root:root@localhost:5433/watchly?schema=public",
  CORS_ALLOWED_ORIGINS: "http://localhost:4000",
} as const;
