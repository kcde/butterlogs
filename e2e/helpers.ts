import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { admin, createTestUser, must, type TestUser } from "../tests/db/helpers";

/** No accessibility violations on the screen as it is now. */
export async function expectAccessible(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map(({ id, help, nodes }) => ({ id, help, targets: nodes.map((node) => node.target) }))).toEqual([]);
}

/**
 * Catches the "email me a code" request so tests never send real email, and
 * keeps what the app asked for. Verifying the code still hits Supabase.
 */
export async function catchSendCode(page: Page) {
  const sent: { email?: string; data?: { display_name?: string }; create_user?: boolean }[] = [];
  await page.route("**/auth/v1/otp*", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  return sent;
}

/**
 * The code Supabase would have emailed. Makes the user first when it's a new
 * sign-up (as Supabase would on sending the code). generateLink sends nothing.
 */
export async function codeFor(email: string, newUser?: { display_name: string }) {
  if (newUser) {
    const created = await admin().auth.admin.createUser({ email, email_confirm: true, user_metadata: newUser });
    if (created.error) throw created.error;
  }
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  return { code: data.properties.email_otp, userId: data.user.id };
}

/** A user who already has a business, signed in on this page through the code screen. */
export async function logIn(page: Page) {
  const user = await createTestUser();
  await catchSendCode(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page).toHaveURL(/\/code$/);
  // Checked as soon as the last digit is in.
  await page.getByLabel("Code").fill((await codeFor(user.email)).code);
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
  return user;
}

/**
 * A user who already has a business, signed in by putting her login on the
 * phone directly (as the code screen would), so the service worker can run:
 * requests made once it controls the page can't be caught by page.route.
 * Pass a user to sign in one already prepared (e.g. with seed()).
 */
export async function signInDirectly(page: Page, prepared?: TestUser) {
  const user = prepared ?? (await createTestUser());
  const { data } = await user.client.auth.getSession();
  const key = `sb-${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]}-auth-token`;
  await page.addInitScript(
    ([name, value]) => {
      if (!localStorage.getItem(name)) localStorage.setItem(name, value);
    },
    [key, JSON.stringify(data.session)],
  );
  await page.goto("/recipes");
  // The title shows once her business is on the phone (the first sync is done).
  await expect(page.getByRole("heading", { name: "Recipes", level: 1 })).toBeVisible();
  return user;
}

/** Ingredients with their last restock, written as the user (through RLS). Returns their ids by name. */
export async function addIngredients(
  { client, businessId }: TestUser,
  items: readonly { name: string; unit: string; priceMinor: number | null; size: number }[],
) {
  const rows = items.map((item) => ({
    id: crypto.randomUUID(),
    business_id: businessId,
    name: item.name,
    unit: item.unit,
    pack_price_minor: item.priceMinor,
    pack_size: item.size,
    pack_size_unit: item.unit,
  }));
  must(await client.from("ingredients").insert(rows));
  return Object.fromEntries(rows.map((row) => [row.name, row.id]));
}

/** The overhead item names in a user's business, in order. */
export async function overheadNames(userId: string) {
  const [member] = must(await admin().from("business_members").select("business_id").eq("user_id", userId));
  const items = must(
    await admin().from("overhead_items").select("name").eq("business_id", member.business_id).order("position"),
  );
  return items.map((item) => item.name);
}
