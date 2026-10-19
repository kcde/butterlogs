import { createSerwistRoute } from "@serwist/turbopack";
import { spawnSync } from "node:child_process";

// Changes on every deploy, so phones pick up the new app shell.
const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  // Every app page, so each opens with no connection.
  additionalPrecacheEntries: [
    "/",
    "/welcome",
    "/signup",
    "/login",
    "/code",
    "/setup",
    "/recipes",
    "/ingredients",
    "/settings",
  ].map((url) => ({ url, revision })),
  // Serwist's defaults plus fonts (Noto Sans) and the SQLite engine PowerSync's
  // default storage (IDBBatchAtomicVFS) loads. Without them the app can't
  // render or open its database offline.
  globPatterns: [
    ".next/static/**/*.{js,css,html,ico,png,svg,webp,json,webmanifest,woff2}",
    ".next/static/media/wa-sqlite-async.*.wasm",
    "public/**/*",
  ],
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true,
});
