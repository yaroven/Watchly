import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const UNSAFE = /[^A-Za-z0-9._-]+/g;

export default async function withWorkDir<T>(
  label: string,
  work: (dir: string) => Promise<T>,
): Promise<T> {
  const dir = await mkdtemp(path.join(tmpdir(), `${label.replace(UNSAFE, "-")}-`));

  try {
    return await work(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
