import { Job } from "bullmq";
import { storage, Store } from "nestjs-pino/storage";
import { currentLogger } from "../common/utils/log-root.util";
import { copyMethodMetadata } from "../common/utils/method-metadata.util";

export const JobContext =
  (): MethodDecorator => (_target, _propertyKey, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value as (job: Job, ...rest: unknown[]) => unknown;

    descriptor.value = function (this: unknown, job: Job, ...rest: unknown[]) {
      const parent = currentLogger();
      if (!parent) return originalMethod.call(this, job, ...rest) as unknown;

      const logger = parent.child({ queue: job.queueName, jobId: job.id, jobName: job.name });
      return storage.run(
        new Store(logger),
        () => originalMethod.call(this, job, ...rest) as unknown,
      );
    };

    copyMethodMetadata(originalMethod, descriptor.value as object);
    return descriptor;
  };
