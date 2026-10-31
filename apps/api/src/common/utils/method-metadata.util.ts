export function copyMethodMetadata(source: object, target: object): void {
  for (const key of Reflect.getMetadataKeys(source)) {
    Reflect.defineMetadata(key, Reflect.getMetadata(key, source), target);
  }
}
