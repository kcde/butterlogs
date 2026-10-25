import { expect, type Locator, type Page, test } from "@playwright/test";
import { admin, createTestUser, must, seed } from "../tests/db/helpers";
import { expectAccessible, signInDirectly } from "./helpers";

// M4: the ingredient list (PRD F3). Ingredients.dc.html, IngredientSheet.dc.html,
// DeleteIngredient.dc.html, EmptyIngredients.dc.html.

// Screenshots for comparing with the mockups, when SHOTS names a folder.
async function shot(page: Page, name: string) {
  if (!process.env.SHOTS) return;
  await page.screenshot({ path: `${process.env.SHOTS}/${name}-${test.info().project.name}.png`, animations: "disabled" });
}

async function openIngredients(page: Page) {
  await page.getByRole("link", { name: "Ingredients", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ingredients", level: 1 })).toBeVisible();
}

const sheet = (page: Page) => page.getByRole("dialog");
const card = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name }).getByRole("button");

async function fillSheet(
  page: Page,
  fields: { name?: string; price?: string; size?: string; packUnit?: string; measure?: string },
) {
  const form = sheet(page);
  if (fields.name !== undefined) await form.getByLabel("Name").fill(fields.name);
  if (fields.measure) await form.getByLabel("I measure it in").selectOption(fields.measure);
  if (fields.price !== undefined) await form.getByLabel("Pack price").fill(fields.price);
  if (fields.size !== undefined) await form.getByLabel("Pack size", { exact: true }).fill(fields.size);
  if (fields.packUnit) await form.getByLabel("Pack size unit").selectOption(fields.packUnit);
}

async function save(page: Page) {
  await sheet(page).getByRole("button", { name: "Save" }).click();
  await expect(sheet(page)).toBeHidden();
}

async function expectCard(item: Locator, cost: string, meta?: string) {
  await expect(item).toContainText(cost);
  if (meta) await expect(item).toContainText(meta);
}

test("she adds ingredients with a price, a missing price and ₦0, then searches and edits", async ({ page }) => {
  await signInDirectly(page);
  await openIngredients(page);

  // EmptyIngredients.dc.html
  await expect(page.getByRole("heading", { name: "No ingredients yet" })).toBeVisible();
  await expectAccessible(page);
  await shot(page, "empty");

  // PRD §9: ₦15,000 per 12.5 kg, measured in g → ₦1.20 per g.
  await page.getByRole("button", { name: "Add your first ingredient" }).click();
  await expect(sheet(page).getByRole("heading", { name: "New ingredient" })).toBeVisible();
  await fillSheet(page, { name: "Flour", price: "15,000", size: "12.5", packUnit: "kg" });
  await expect(sheet(page)).toContainText("Works out to₦1.20 per g");
  await expectAccessible(page);
  await shot(page, "sheet-new");
  await save(page);
  await expectCard(card(page, "Flour"), "₦1.20 / g", "12.5 kg · ₦15,000 · updated today");

  // An empty price is missing: "add price", no details.
  await page.getByRole("button", { name: "New ingredient" }).click();
  await fillSheet(page, { name: "Egg white" });
  await expect(sheet(page)).not.toContainText("Works out to");
  await save(page);
  await expect(card(page, "Egg white")).toContainText("add price");
  await expect(card(page, "Egg white")).not.toContainText("updated");

  // ₦0 is a real price. Measuring in ml starts the pack in ml too; then 1 L.
  await page.getByRole("button", { name: "New ingredient" }).click();
  await fillSheet(page, { name: "Water", measure: "ml" });
  await expect(sheet(page).getByLabel("Pack size unit")).toHaveValue("ml");
  await fillSheet(page, { price: "0", size: "1", packUnit: "l" });
  await expect(sheet(page)).toContainText("Works out to₦0 per ml");
  await save(page);
  await expectCard(card(page, "Water"), "₦0 / ml", "1 L · ₦0 · updated today");

  // Names are unique ignoring capitals; the pack unit only offers the same kind.
  await page.getByRole("button", { name: "New ingredient" }).click();
  await fillSheet(page, { name: "flour" });
  await sheet(page).getByRole("button", { name: "Save" }).click();
  await expect(sheet(page).getByText("You already have Flour.")).toBeVisible();
  const packUnits = await sheet(page).getByLabel("Pack size unit").locator("option").allTextContents();
  expect(packUnits).toEqual(["g", "kg", "oz", "lb"]);
  await sheet(page).getByRole("button", { name: "Close" }).click();

  // A to Z.
  await expect(page.getByRole("listitem")).toHaveText([/^Egg white/, /^Flour/, /^Water/]);
  await expectAccessible(page);
  await shot(page, "list");

  // Search by name, ignoring capitals.
  const search = page.getByRole("searchbox", { name: "Search ingredients" });
  await search.fill("FL");
  await expect(page.getByRole("listitem")).toHaveText([/^Flour/]);
  await page.getByRole("button", { name: "Clear search" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await search.fill("xyz");
  await expect(page.getByText("No ingredients match “xyz”.")).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();

  // Editing the price updates the cost.
  await card(page, "Flour").click();
  await expect(sheet(page).getByRole("heading", { name: "Edit ingredient" })).toBeVisible();
  await expect(sheet(page).getByLabel("Pack price")).toHaveValue("15,000");
  await expect(sheet(page)).toContainText("Price updated today");
  await shot(page, "sheet-edit");
  await fillSheet(page, { price: "20000" });
  await save(page);
  await expectCard(card(page, "Flour"), "₦1.60 / g", "12.5 kg · ₦20,000 · updated today");
});

test("an ingredient in a recipe: changing its unit converts the recipe, and deleting warns first", async ({ page }) => {
  // Flour (₦15,000 / 12.5 kg, in g) with a 500 g line in Vanilla Cake.
  const user = await createTestUser();
  const ids = await seed(user);
  await signInDirectly(page, user);
  await openIngredients(page);
  await expectCard(card(page, "Flour"), "₦1.20 / g");

  await card(page, "Flour").click();
  await expect(sheet(page)).toContainText("Used in 1 recipe");
  // Editing keeps the same kind.
  const measureUnits = await sheet(page).getByLabel("I measure it in").locator("option").allTextContents();
  expect(measureUnits).toEqual(["g", "kg", "oz", "lb"]);
  await fillSheet(page, { measure: "kg" });
  await expect(sheet(page)).toContainText("Works out to₦1,200 per kg");
  await save(page);
  await expectCard(card(page, "Flour"), "₦1,200 / kg");

  // The recipe line moved with it, so the cost stays ₦600.
  await expect
    .poll(async () => (await admin().from("recipe_lines").select("amount").eq("id", ids.recipe_lines).single()).data?.amount)
    .toBe(0.5);

  // DeleteIngredient.dc.html: in use, so it warns and lists the recipe.
  await card(page, "Flour").click();
  await sheet(page).getByRole("button", { name: "Delete ingredient" }).click();
  const warning = page.getByRole("alertdialog", { name: "Flour is in 1 recipe" });
  await expect(warning).toBeVisible();
  await expect(warning).toContainText("Vanilla Cake");
  await expectAccessible(page);
  await shot(page, "delete-in-use");

  // Keep goes back to the sheet.
  await warning.getByRole("button", { name: "Keep Flour" }).click();
  await expect(sheet(page).getByRole("heading", { name: "Edit ingredient" })).toBeVisible();

  await sheet(page).getByRole("button", { name: "Delete ingredient" }).click();
  await warning.getByRole("button", { name: "Delete anyway" }).click();
  await expect(page.getByRole("heading", { name: "No ingredients yet" })).toBeVisible();

  // A soft delete: the row stays, marked deleted.
  await expect
    .poll(async () => (await admin().from("ingredients").select("deleted_at").eq("id", ids.ingredients).single()).data?.deleted_at)
    .not.toBeNull();
});

test("deleting an ingredient no recipe uses asks first", async ({ page }) => {
  await signInDirectly(page);
  await openIngredients(page);
  await page.getByRole("button", { name: "Add your first ingredient" }).click();
  await fillSheet(page, { name: "Egg white" });
  await save(page);

  await card(page, "Egg white").click();
  await sheet(page).getByRole("button", { name: "Delete ingredient" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Delete Egg white?" });
  await expect(confirm).toContainText("This can’t be undone. No recipes use it.");
  await expectAccessible(page);
  await shot(page, "delete-unused");

  await confirm.getByRole("button", { name: "Cancel" }).click();
  await expect(sheet(page)).toBeVisible();
  await sheet(page).getByRole("button", { name: "Delete ingredient" }).click();
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("heading", { name: "No ingredients yet" })).toBeVisible();
});

test("an ingredient added offline syncs when the phone is back online", async ({ page, context }) => {
  const user = await createTestUser();
  await signInDirectly(page, user);
  await openIngredients(page);

  await context.setOffline(true);
  await page.getByRole("button", { name: "Add your first ingredient" }).click();
  await fillSheet(page, { name: "Sugar", price: "20,000", size: "12.5", packUnit: "kg" });
  await save(page);
  await expectCard(card(page, "Sugar"), "₦1.60 / g");
  await expect(page.getByText("1 change waiting")).toBeVisible();

  await context.setOffline(false);
  await expect
    .poll(async () =>
      must(await admin().from("ingredients").select("name, pack_price_minor").eq("business_id", user.businessId)),
    )
    .toEqual([{ name: "Sugar", pack_price_minor: 2_000_000 }]);
});
