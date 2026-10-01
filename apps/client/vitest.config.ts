import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests only — no DOM, no component rendering yet. The first thing worth
 * pinning here is the auth plumbing in `shared/`, which is module-level state
 * that no type can hold and that has regressed three times.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["{shared,features}/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      "@shared": fileURLToPath(new URL("./shared", import.meta.url)),
      "@features": fileURLToPath(new URL("./features", import.meta.url)),
    },
  },
});
