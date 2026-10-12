export default function toDtoResponseUtil<T, A extends unknown[]>(
  dto: new (...args: A) => T,
  ...args: A
): T {
  return new dto(...args);
}
