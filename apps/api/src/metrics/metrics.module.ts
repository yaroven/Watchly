import { Global, Module } from "@nestjs/common";
import { collectDefaultMetrics, Registry } from "prom-client";
import { METRICS_REGISTRY } from "./metrics.const";

@Global()
@Module({
  providers: [
    {
      provide: METRICS_REGISTRY,
      useFactory: (): Registry => {
        const registry = new Registry();
        collectDefaultMetrics({ register: registry });
        return registry;
      },
    },
  ],
  exports: [METRICS_REGISTRY],
})
export class MetricsModule {}
