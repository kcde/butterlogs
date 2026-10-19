import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      // The pure maths and helpers. The Supabase and PowerSync glue (db/,
      // supabase.ts, auth.ts, session.ts) is covered by test:db and e2e.
      include: ["src/lib/**"],
      exclude: ["src/lib/db/**", "src/lib/supabase.ts", "src/lib/auth.ts", "src/lib/session.ts", "**/*.test.ts"],
      thresholds: { 100: true },
    },
  },
});
