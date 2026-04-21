export function normalizeStreamUrl(url: string) {
  return url.replace("localstack", "localhost");
}
