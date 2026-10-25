import { expect, test } from "@playwright/test";
import { signInDirectly } from "./helpers";

// The database lives in OPFS wherever the browser allows it (lib/db/storage.ts).
// Playwright's WebKit has no OPFS, so the other flows run on the IndexedDB
// fallback; this one runs in Chromium to cover the OPFS path itself.
test.use({ browserName: "chromium", serviceWorkers: "allow" });

test("the database is kept in OPFS and opens offline", async ({ page, context }, info) => {
  test.skip(info.project.name !== "light", "Storage doesn't depend on the colour scheme");

  await signInDirectly(page);

  const inOpfs = await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory();
    return root.getFileHandle("butterlogs.db").then(
      () => true,
      () => false,
    );
  });
  expect(inOpfs).toBe(true);

  // Once the service worker controls the page it has the app shell and the
  // OPFS build of SQLite.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
  await expect(page.getByText("Offline")).toBeVisible();
});
