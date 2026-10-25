import { expect, type Locator, type Page, test } from "@playwright/test";
import { admin, createTestUser, must, seed } from "../tests/db/helpers";
import { expectAccessible, signInDirectly } from "./helpers";

// M4: the ingredient list (PRD F3). Ingredients.dc.html, IngredientSheet.dc.html,
// DeleteIngredient.dc.html, EmptyIngredients.dc.html, and Restock (no mockup).

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

async function fillIngredient(page: Page, fields: { name?: string; measure?: string }) {
  const form = sheet(page);
  if (fields.name !== undefined) await form.getByLabel("Name").fill(fields.name);
  if (fields.measure) await form.getByLabel("I measure it in").selectOption(fields.measure);
}

async function fillRestock(page: Page, fields: { amount?: string; unit?: string; price?: string }) {
  const form = sheet(page);
  if (fields.amount !== undefined) await form.getByLabel("Amount bought", { exact: true }).fill(fields.amount);
  if (fields.unit) await form.getByLabel("Amount bought unit").selectOption(fields.unit);
  if (fields.price !== undefined) await form.getByLabel("Price paid").fill(fields.price);
}

async function save(page: Page) {
  await sheet(page).getByRole("button", { name: "Save" }).click();
  await expect(sheet(page)).toBeHidden();
}

async function expectRestock(page: Page, name: string) {
  await expect(sheet(page).getByRole("heading", { name: `Restock — ${name}` })).toBeVisible();
}

async function expectCard(item: Locator, cost: string, meta?: string) {
  await expect(item).toContainText(cost);
  if (meta) await expect(item).toContainText(meta);
}

test("she adds ingredients, restocks them with a price or ₦0 or not at all, then searches and restocks again", async ({
  page,
}) => {
  await signInDirectly(page);
  await openIngredients(page);

  // EmptyIngredients.dc.html
  await expect(page.getByRole("heading", { name: "No ingredients yet" })).toBeVisible();
  await expectAccessible(page);
  await shot(page, "empty");

  // The ingredient first: just its name and how she measures it.
  await page.getByRole("button", { name: "Add your first ingredient" }).click();
  await expect(sheet(page).getByRole("heading", { name: "New ingredient" })).toBeVisible();
  await fillIngredient(page, { name: "Flour" });
  await expectAccessible(page);
  await shot(page, "sheet-new");
  await sheet(page).getByRole("button", { name: "Save" }).click();

  // Then Restock. PRD §9: ₦15,000 for 12.5 kg, measured in g → ₦1.20 per g.
  await expectRestock(page, "Flour");
  await expect(sheet(page).getByLabel("Amount bought unit")).toHaveValue("g");
  await fillRestock(page, { amount: "12.5", unit: "kg", price: "15,000" });
  await expect(sheet(page)).toContainText("Works out to₦1.20 per g");
  await expectAccessible(page);
  await shot(page, "sheet-restock");
  await save(page);
  await expectCard(card(page, "Flour"), "₦1.20 / g", "12.5 kg · ₦15,000 · updated today");

  // Not bought yet: closing Restock leaves the price missing ("add price", no details).
  await page.getByRole("button", { name: "New ingredient" }).click();
  await fillIngredient(page, { name: "Egg white" });
  await sheet(page).getByRole("button", { name: "Save" }).click();
  await expectRestock(page, "Egg white");
  await sheet(page).getByRole("button", { name: "Close" }).click();
  await expect(card(page, "Egg white")).toContainText("add price");
  await expect(card(page, "Egg white")).not.toContainText("updated");

  // ₦0 is a real price. Measured in ml, the amount starts in ml too; then 1 L.
  await page.getByRole("button", { name: "New ingredient" }).click();
  await fillIngredient(page, { name: "Water", measure: "ml" });
  await sheet(page).getByRole("button", { name: "Save" }).click();
  await expectRestock(page, "Water");
  await expect(sheet(page).getByLabel("Amount bought unit")).toHaveValue("ml");
  await fillRestock(page, { amount: "1", unit: "l", price: "0" });
  await expect(sheet(page)).toContainText("Works out to₦0 per ml");
  await save(page);
  await expectCard(card(page, "Water"), "₦0 / ml", "1 L · ₦0 · updated today");

  // Names are unique ignoring capitals.
  await page.getByRole("button", { name: "New ingredient" }).click();
  await fillIngredient(page, { name: "flour" });
  await sheet(page).getByRole("button", { name: "Save" }).click();
  await expect(sheet(page).getByText("You already have Flour.")).toBeVisible();
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

  // Tapping Flour opens the ingredient, with what she last paid.
  await card(page, "Flour").click();
  await expect(sheet(page).getByRole("heading", { name: "Edit ingredient" })).toBeVisible();
  await expect(sheet(page)).toContainText("Works out to₦1.20 per g");
  await expect(sheet(page)).toContainText("Last bought 12.5 kg for ₦15,000, today");
  await expect(sheet(page).getByLabel("Pack price")).toHaveCount(0);
  await expectAccessible(page);
  await shot(page, "sheet-edit");

  // Restock starts from the same bag, with the price empty, and needs both.
  await sheet(page).getByRole("button", { name: "Restock" }).click();
  await expectRestock(page, "Flour");
  await expect(sheet(page).getByLabel("Amount bought", { exact: true })).toHaveValue("12.5");
  await expect(sheet(page).getByLabel("Amount bought unit")).toHaveValue("kg");
  await expect(sheet(page).getByLabel("Price paid")).toHaveValue("");
  const units = await sheet(page).getByLabel("Amount bought unit").locator("option").allTextContents();
  expect(units).toEqual(["g", "kg", "oz", "lb"]);
  await fillRestock(page, { amount: "" });
  await sheet(page).getByRole("button", { name: "Save" }).click();
  await expect(sheet(page).getByText("Type an amount above 0, like 12.5.")).toBeVisible();
  await expect(sheet(page).getByText("Type the price, like 15,000.")).toBeVisible();

  // A full bag this time.
  await fillRestock(page, { amount: "50", price: "56,000" });
  await expect(sheet(page)).toContainText("Works out to₦1.12 per g");
  await save(page);
  await expectCard(card(page, "Flour"), "₦1.12 / g", "50 kg · ₦56,000 · updated today");
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
  await fillIngredient(page, { measure: "kg" });
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
  await fillIngredient(page, { name: "Egg white" });
  await sheet(page).getByRole("button", { name: "Save" }).click();
  await expectRestock(page, "Egg white");
  await sheet(page).getByRole("button", { name: "Close" }).click();

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
  await fillIngredient(page, { name: "Sugar" });
  await sheet(page).getByRole("button", { name: "Save" }).click();
  await fillRestock(page, { amount: "12.5", unit: "kg", price: "20,000" });
  await save(page);
  await expectCard(card(page, "Sugar"), "₦1.60 / g");
  await expect(page.getByText("2 changes waiting")).toBeVisible();

  await context.setOffline(false);
  await expect
    .poll(async () =>
      must(await admin().from("ingredients").select("name, pack_price_minor").eq("business_id", user.businessId)),
    )
    .toEqual([{ name: "Sugar", pack_price_minor: 2_000_000 }]);
});
