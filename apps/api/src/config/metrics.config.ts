import { registerAs } from "@nestjs/config";

export const MetricsConfigName = "metrics";

export interface MetricsConfig {
  port: number;
}

export default registerAs(MetricsConfigName, (): MetricsConfig => ({
  port: parseInt(process.env.METRICS_PORT ?? "", 10) || 9464,
}));
