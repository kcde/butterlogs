import { defineConfig, devices } from "@playwright/test";

// Screens are checked against the mockups at 390 × 844, in light and dark.
// Offline tests need the service worker, so tests run against a production build.
const phone = {
  ...devices["iPhone 15"],
  viewport: { width: 390, height: 844 },
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "light", use: { ...phone, colorScheme: "light" } },
    { name: "dark", use: { ...phone, colorScheme: "dark" } },
  ],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
