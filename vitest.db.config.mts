import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Database tests against the live Supabase project and PowerSync instance,
// with throwaway users (`npm run test:db`). Not part of `npm test`.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    globalSetup: ["tests/db/global-setup.ts"],
    setupFiles: ["tests/db/load-env.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
