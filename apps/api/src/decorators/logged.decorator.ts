import { HttpException, Logger } from "@nestjs/common";
import { currentLogger } from "../common/utils/log-root.util";
import { toLoggable } from "../common/utils/loggable.util";
import { copyMethodMetadata } from "../common/utils/method-metadata.util";

type FailedLevel = "warn" | "error";

export interface LoggedOptions {
  action?: string;
  completedLevel?: "log" | "debug";
  failedLevel?: FailedLevel | ((error: unknown) => FailedLevel);
  data?: (...args: any[]) => unknown;
}

type Method = (...args: unknown[]) => unknown;

const reported = new WeakSet<object>();

function isDebugEnabled(): boolean {
  return currentLogger()?.isLevelEnabled("debug") ?? false;
}

function failureLevel(
  error: unknown,
  failedLevel: LoggedOptions["failedLevel"],
): FailedLevel | "debug" {
  if (typeof error === "object" && error !== null) {
    if (reported.has(error)) return "debug";
    reported.add(error);
  }
  if (typeof failedLevel === "function") return failedLevel(error);
  if (failedLevel) return failedLevel;
  return error instanceof HttpException && error.getStatus() < 500 ? "warn" : "error";
}

function wrap(
  className: string,
  propertyKey: string | symbol,
  originalMethod: Method,
  options: LoggedOptions,
): Method {
  const { completedLevel = "log", failedLevel, data = (...args: unknown[]) => args } = options;
  const name = options.action ?? `${className}.${String(propertyKey)}`;
  const logger = new Logger(className);

  const wrapped = function (this: unknown, ...args: unknown[]) {
    const verbose = isDebugEnabled();
    const startedAt = performance.now();
    const elapsed = () => Math.round(performance.now() - startedAt);

    if (verbose) {
      logger.debug({ msg: `${name} started`, action: name, data: toLoggable(data(...args)) });
    }

    const completed = (result: unknown) => {
      logger[completedLevel]({
        msg: `${name} completed`,
        action: name,
        ms: elapsed(),
        ...(verbose && { result: toLoggable(result) }),
      });
      return result;
    };
    const failed = (error: unknown): never => {
      logger[failureLevel(error, failedLevel)]({
        msg: `${name} failed`,
        action: name,
        ms: elapsed(),
        err: error,
        data: toLoggable(data(...args)),
      });
      throw error;
    };

    try {
      const result: unknown = originalMethod.apply(this, args);
      return result instanceof Promise ? result.then(completed, failed) : completed(result);
    } catch (error) {
      return failed(error);
    }
  };

  copyMethodMetadata(originalMethod, wrapped);
  return wrapped;
}

export const Logged =
  (options: LoggedOptions = {}): MethodDecorator =>
  (target, propertyKey, descriptor: PropertyDescriptor) => {
    descriptor.value = wrap(
      target.constructor.name,
      propertyKey,
      descriptor.value as Method,
      options,
    );
    return descriptor;
  };
