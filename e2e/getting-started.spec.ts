import { expect, test } from "@playwright/test";
import { testEmail } from "../tests/db/helpers";
import { catchSendCode, codeFor, expectAccessible, logIn, overheadNames, signInDirectly } from "./helpers";

// M3: from first open to an empty Recipes screen (PRD F1, F9).

// The sign-in flows catch the "send code" request so no real email is sent.
// Once a service worker controls the page, page.route can't see its requests,
// so these run without it; the offline test below runs with it.
test.use({ serviceWorkers: "block" });

test("a new user signs up with a code, sets up her business and reaches Recipes", async ({ page }) => {
  const email = testEmail();
  const sent = await catchSendCode(page);

  await page.goto("/");
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: "Butterlogs" })).toBeVisible();
  await expectAccessible(page);

  await page.getByRole("link", { name: "Get started" }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText("Add your name.")).toBeVisible();
  await page.getByLabel("Your name").fill("Ada");
  await page.getByLabel("Email").fill(email);
  await expectAccessible(page);
  await page.getByRole("button", { name: "Send code" }).click();

  await expect(page).toHaveURL(/\/code$/);
  expect(sent[0]).toEqual(expect.objectContaining({ email, create_user: true, data: { display_name: "Ada" } }));
  await expect(page.getByText(`We sent a 6-digit code to ${email}.`)).toBeVisible();
  await expect(page.getByText(/Didn’t get it\? Resend code in 0:\d\d/)).toBeVisible();
  await expectAccessible(page);

  // "Change" goes back with what she typed.
  await page.getByRole("link", { name: "Change" }).click();
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await expect(page.getByLabel("Your name")).toHaveValue("Ada");
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page).toHaveURL(/\/code$/);

  // The code is checked as soon as the last digit is in.
  await page.getByLabel("Code").fill("000000");
  await expect(page.getByText("That code didn’t work. Check it, or ask for a new one.")).toBeVisible();
  await expectAccessible(page);

  const { code, userId } = await codeFor(email, { display_name: "Ada" });
  await page.getByLabel("Code").fill(code);

  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByRole("heading", { name: "Set up your business" })).toBeVisible();
  // Naira first on a phone in Lagos; Markup 50% preselected.
  await expect(page.getByLabel("Currency")).toHaveValue("NGN");
  await expect(page.getByRole("radio", { name: "Markup %" })).toBeChecked();
  await expect(page.getByText("A cake that costs ₦10,000 to make sells for ₦15,000.")).toBeVisible();
  await page.getByRole("radio", { name: "Margin %" }).click();
  await expect(page.getByText("A cake that costs ₦10,000 to make sells for ₦20,000.")).toBeVisible();
  await page.getByLabel("Margin percentage").fill("100");
  await page.getByLabel("Margin percentage").blur();
  await expect(page.getByText("Margin must be under 100%.")).toBeVisible();
  await page.getByLabel("Margin percentage").fill("50");
  // A profit or price differs per product, so it's typed on each recipe instead.
  await page.getByRole("radio", { name: "Fixed profit" }).click();
  await expect(page.getByText("You’ll type the profit for each recipe when you create it.")).toBeVisible();
  await page.getByRole("radio", { name: "Set price" }).click();
  await expect(page.getByText("You’ll type the price for each recipe when you create it.")).toBeVisible();
  await expect(page.getByText(/A cake that costs/)).toBeHidden();
  await page.getByRole("radio", { name: "Markup %" }).click();
  await expect(page.getByLabel("Markup percentage")).toHaveValue("50");
  await page.getByLabel("Business name").fill("Test Bakery");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/recipes\?install=1$/);
  const guide = page.getByRole("dialog", { name: "Put Butterlogs on your home screen" });
  await expect(guide).toBeVisible();
  await expectAccessible(page);
  await guide.getByRole("button", { name: "Done" }).click();

  await expect(page).toHaveURL(/\/recipes$/);
  await expect(guide).toBeHidden();
  await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Recipes" })).toHaveAttribute("aria-current", "page");
  await expectAccessible(page);

  expect(await overheadNames(userId)).toEqual(["Gas", "Electricity", "Transport", "Labour", "Packaging"]);
});

test("an existing user logs in with a code and lands on Recipes", async ({ page }) => {
  await logIn(page);
  await expect(page.getByText("All synced")).toBeVisible();
  // Reopening the app keeps her signed in.
  await page.goto("/");
  await expect(page).toHaveURL(/\/recipes$/);
});

test("logging in with an email that has no account says so", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("Email").fill(testEmail());
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByText("No account uses this email.")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test.describe("with the service worker", () => {
  test.use({ serviceWorkers: "allow" });

  test("the tab screens open offline, even after her login has expired", async ({ page, context }) => {
    await signInDirectly(page);
    // Once the service worker controls the page it has the app shell.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
    await expect(page.getByText("Offline")).toBeVisible();

    // An hour on, the access token has expired and can't be refreshed offline.
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((name) => name.endsWith("-auth-token"))!;
      const session = JSON.parse(localStorage.getItem(key)!);
      localStorage.setItem(key, JSON.stringify({ ...session, expires_at: Math.floor(Date.now() / 1000) - 60 }));
    });
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByRole("link", { name: "Recipes" }).click();
    await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
  });
});

test("signing out from Settings goes back to Welcome", async ({ page }) => {
  await logIn(page);
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await page.getByRole("button", { name: "Install on iPhone" }).click();
  await expect(page.getByRole("dialog", { name: "Put Butterlogs on your home screen" })).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Maybe later" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await page.goto("/recipes");
  await expect(page).toHaveURL(/\/welcome$/);
});
