import { defineConfig, devices } from "@playwright/test";

// Supabase keys for the test helpers (throwaway users on the live project).
process.loadEnvFile(".env.local");

// Its own port, so a running `npm run dev` (on 3000) is never mistaken for the
// production build the tests need (the service worker only runs there).
const PORT = 3100;

// Screens are checked against the mockups at 390 × 844, in light and dark.
// Offline tests need the service worker, so tests run against a production build.
const phone = {
  ...devices["iPhone 15"],
  viewport: { width: 390, height: 844 },
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // The flows use the live Supabase and PowerSync; more browsers at once only
  // starves WebKit on a laptop.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  globalSetup: "./e2e/global-setup.ts",
  // A fresh phone's first PowerSync sync can take a few seconds, more so with
  // several browsers starting at once.
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    // A phone in Lagos, like the pilot's (Setup puts Naira first).
    timezoneId: "Africa/Lagos",
    locale: "en-NG",
  },
  projects: [
    { name: "light", use: { ...phone, colorScheme: "light" } },
    { name: "dark", use: { ...phone, colorScheme: "dark" } },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
