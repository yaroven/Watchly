export const DEV_DEFAULTS = {
  REDIS_HOST: "localhost",
  REDIS_PORT: "6379",
  S3_ACCESS_KEY_ID: "localstack",
  S3_SECRET_ACCESS_KEY: "localstack",
  DATABASE_URL: "postgresql://root:root@localhost:5433/watchly?schema=public",
  CORS_ALLOWED_ORIGINS: "http://localhost:4000",
  JWT_SECRET: "LOCAL_DEVELOPMENT",
  JWT_EXPIRES_IN: "1h",
  JWT_REFRESH_SECRET: "LOCAL_DEVELOPMENT_REFRESH",
  JWT_REFRESH_EXPIRES_IN: "30d",
} as const;
