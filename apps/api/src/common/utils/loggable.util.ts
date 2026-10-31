import { Job, Queue } from "bullmq";
import { Stream } from "stream";

const SECRET_KEY = /pass(word)?|secret|token|hash|authorization|cookie|api_?key/i;
const MAX_DEPTH = 4;
const MAX_ITEMS = 20;
const MAX_STRING = 500;
const SIGNED_QUERY = /\?[^\s]*X-Amz-Signature=[^\s]*/;

export const REDACTED = "[Redacted]";

export function toLoggable(value: unknown): unknown {
  return walk(value, 0, new WeakSet());
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return truncate(value.replace(SIGNED_QUERY, `?${REDACTED}`));
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function") return `[Function ${value.name || "anonymous"}]`;
  if (typeof value !== "object") return value;

  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
  if (value instanceof Date)
    return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  if (value instanceof Error) return { name: value.name, message: value.message };
  if (value instanceof Stream) return `[${value.constructor.name}]`;
  if (value instanceof Job) {
    return walk(
      {
        id: value.id,
        name: value.name as string,
        queue: value.queueName,
        attemptsMade: value.attemptsMade,
        data: value.data as unknown,
      },
      depth,
      seen,
    );
  }
  if (value instanceof Queue) return `[Queue ${value.name}]`;
  if ("$queryRaw" in value) return "[PrismaClient]";

  if (seen.has(value)) return "[Circular]";
  if (depth >= MAX_DEPTH) return Array.isArray(value) ? `[Array(${value.length})]` : "[Object]";
  seen.add(value);

  if (Array.isArray(value)) return walkList(value, depth, seen);
  if (value instanceof Set) return walkList([...value], depth, seen);
  if (value instanceof Map) return walkList([...value.entries()], depth, seen);
  if (typeof (value as { toJSON?: unknown }).toJSON === "function") {
    return walk((value as { toJSON: () => unknown }).toJSON(), depth, seen);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SECRET_KEY.test(key) ? REDACTED : walk(entry, depth + 1, seen),
    ]),
  );
}

function walkList(items: unknown[], depth: number, seen: WeakSet<object>): unknown[] {
  const head = items.slice(0, MAX_ITEMS).map((item) => walk(item, depth + 1, seen));
  return items.length > MAX_ITEMS ? [...head, `…${items.length - MAX_ITEMS} more`] : head;
}

function truncate(value: string): string {
  return value.length > MAX_STRING
    ? `${value.slice(0, MAX_STRING)}…(${value.length} chars)`
    : value;
}
