import { storage, Store } from "nestjs-pino/storage";

let root: Store["logger"] | undefined;

export function setLogRoot(logger: Store["logger"] | undefined): void {
  root = logger;
}

export function currentLogger(): Store["logger"] | undefined {
  return storage.getStore()?.logger ?? root;
}
