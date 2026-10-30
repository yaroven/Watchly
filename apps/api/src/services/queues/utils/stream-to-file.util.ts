import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export default async function streamToFile(body: Readable, destination: string): Promise<void> {
  await pipeline(body, createWriteStream(destination));
}
