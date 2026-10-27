import { expect, type Page, test } from "@playwright/test";
import { admin, createTestUser, must, seed, type TestUser } from "../tests/db/helpers";
import { VANILLA_CAKE_INGREDIENTS, VANILLA_CAKE_OVERHEAD } from "../tests/fixtures/vanilla-cake";
import { addIngredients, expectAccessible, signInDirectly } from "./helpers";

// M5: making a recipe in three steps, drafts, and the Recipes list (PRD F2,
// F4, F5, F7). NewRecipe1–3.dc.html, CategoryPicker.dc.html,
// AddIngredients.dc.html, Main.dc.html, RecipesDark.dc.html.

async function shot(page: Page, name: string) {
  if (!process.env.SHOTS) return;
  await page.screenshot({ path: `${process.env.SHOTS}/${name}-${test.info().project.name}.png`, animations: "disabled" });
}

const sheet = (page: Page) => page.getByRole("dialog");
const card = (page: Page, name: string) => page.getByRole("listitem").filter({ hasText: name });
const STARTER = ["Gas", "Electricity", "Transport", "Labour"];

async function startRecipe(page: Page) {
  await page.getByRole("link", { name: /^(New recipe|Start a recipe anyway)$/ }).click();
  await expect(page.getByRole("heading", { name: "Basics" })).toBeVisible();
}

async function basics(page: Page, { name, weight, count }: { name: string; weight?: string; count?: string }) {
  await page.getByLabel("Recipe name").fill(name);
  if (count !== undefined) {
    await page.getByRole("radio", { name: "Pieces" }).click();
    await page.getByLabel("Yield pieces").fill(count);
  } else {
    await page.getByLabel("Yield weight", { exact: true }).fill(weight ?? "");
  }
}

async function next(page: Page, heading: string) {
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
}

/** Ticks these in the open Add sheet and adds them. */
async function tick(page: Page, names: readonly string[], button: string) {
  for (const name of names) await sheet(page).getByLabel(name, { exact: true }).check();
  await sheet(page).getByRole("button", { name: button }).click();
  await expect(sheet(page)).toBeHidden();
}

async function amounts(page: Page, values: Record<string, string>) {
  for (const [name, value] of Object.entries(values)) await page.getByLabel(`${name} amount`).fill(value);
}

async function save(page: Page, name: string) {
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByRole("heading", { name: "Recipes", level: 1 })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: `${name} saved` })).toBeVisible();
}

test("she makes Vanilla Cake in three steps and its card shows ₦10,287 (PRD §9)", async ({ page }) => {
  const user = await createTestUser();
  await addIngredients(user, VANILLA_CAKE_INGREDIENTS);
  await signInDirectly(page, user);
  await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
  await startRecipe(page);

  // NewRecipe1.dc.html, with a category made in the picker.
  await basics(page, { name: "Vanilla Cake", weight: "1,500" });
  await page.getByRole("button", { name: /^Category/ }).click();
  await expect(sheet(page).getByRole("heading", { name: "Category" })).toBeVisible();
  await sheet(page).getByLabel("New category").fill("Cakes");
  await expectAccessible(page);
  await shot(page, "category");
  await sheet(page).getByRole("button", { name: "Add", exact: true }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByRole("button", { name: /^Category/ })).toHaveText("Cakes");
  await expectAccessible(page);
  await shot(page, "new-1");
  await next(page, "Ingredients");

  // NewRecipe2.dc.html and AddIngredients.dc.html.
  await page.getByRole("button", { name: "Add ingredients" }).click();
  await expect(sheet(page).getByText("₦1.60 / g")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "add-ingredients");
  await tick(
    page,
    VANILLA_CAKE_INGREDIENTS.map((item) => item.name),
    "Add 9 ingredients",
  );
  await amounts(page, Object.fromEntries(VANILLA_CAKE_INGREDIENTS.map((item) => [item.name, String(item.amount)])));
  await expect(page.getByText("Ingredient cost", { exact: true })).toBeVisible();
  await expect(page.getByText("₦4,937", { exact: true })).toBeVisible();
  await expectAccessible(page);
  await shot(page, "new-2");
  await next(page, "Overhead & price");

  // NewRecipe3.dc.html: four starter items picked, five made on the spot.
  await page.getByRole("button", { name: "Add overhead item" }).click();
  for (const item of VANILLA_CAKE_OVERHEAD.filter((overhead) => !STARTER.includes(overhead.name))) {
    await sheet(page).getByLabel("New item").fill(item.name);
    await sheet(page).getByRole("button", { name: "Add", exact: true }).click();
    await expect(sheet(page).getByLabel(item.name, { exact: true })).toBeChecked();
  }
  await expectAccessible(page);
  await tick(page, STARTER, "Add 9 items");
  await amounts(page, Object.fromEntries(VANILLA_CAKE_OVERHEAD.map((item) => [item.name, String(item.amountMinor / 100)])));
  await expect(page.getByText("₦5,350")).toBeVisible();
  for (const [value, label] of [
    ["₦10,287", "Total cost"],
    ["₦6.86/g", "Cost per gram"],
    ["₦15,431", "Selling price"],
    ["₦5,144", "Profit"],
  ]) {
    await expect(page.getByText(value, { exact: true })).toBeVisible();
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expectAccessible(page);
  await shot(page, "new-3");

  // Main.dc.html.
  await save(page, "Vanilla Cake");
  await expect(card(page, "Vanilla Cake")).toContainText("1,500 g · ₦10,287 · ₦6.86/g");
  await expect(card(page, "Vanilla Cake")).toContainText("Cakes");
  await expect(page.getByRole("button", { name: "Cakes", pressed: false })).toBeVisible();
  await expectAccessible(page);
  await shot(page, "recipes");

  // And on the server: one recipe, one unnamed section, nine lines, nine overhead lines.
  await expect
    .poll(async () => {
      const recipes = must(await admin().from("recipes").select("id, name").eq("business_id", user.businessId));
      const lines = must(await admin().from("recipe_lines").select("id").eq("business_id", user.businessId));
      const overhead = must(await admin().from("recipe_overhead_lines").select("id").eq("business_id", user.businessId));
      return [recipes.map((recipe) => recipe.name), lines.length, overhead.length];
    })
    .toEqual([["Vanilla Cake"], 9, 9]);
});

test("a cost-only filling used inside a cake, a named second section, and a count recipe", async ({ page }) => {
  const user = await createTestUser();
  // ₦1.60 per g.
  await addIngredients(user, [VANILLA_CAKE_INGREDIENTS[0]]);
  await signInDirectly(page, user);

  // Salted Caramel: 625 g of sugar (₦1,000) makes 500 g → ₦2 per g; no price.
  await startRecipe(page);
  await basics(page, { name: "Salted Caramel", weight: "500" });
  await next(page, "Ingredients");
  await page.getByRole("button", { name: "Add ingredients" }).click();
  await tick(page, ["Sugar"], "Add 1 ingredient");
  await amounts(page, { Sugar: "625" });
  await next(page, "Overhead & price");
  await page.getByRole("radio", { name: "Cost only" }).click();
  await expect(page.getByText("Selling price")).toHaveCount(0);
  await expect(page.getByText("₦2/g", { exact: true })).toBeVisible();
  await shot(page, "cost-only");
  await save(page, "Salted Caramel");

  // A cake: sugar in the unnamed first section, then a "Salted Caramel" section using 200 g of it.
  await page.getByRole("link", { name: "New recipe" }).click();
  await basics(page, { name: "Caramel Cake", weight: "1,000" });
  await next(page, "Ingredients");
  await page.getByRole("button", { name: "Add ingredients" }).click();
  await tick(page, ["Sugar"], "Add 1 ingredient");
  await amounts(page, { Sugar: "100" });
  await page.getByRole("button", { name: "Add section" }).click();
  await page.getByLabel("Section name").fill("Salted Caramel");
  await page.getByRole("button", { name: "Add a recipe" }).last().click();
  await expect(sheet(page).getByText("₦2 / g")).toBeVisible();
  await tick(page, ["Salted Caramel"], "Add 1 recipe");
  await amounts(page, { "Salted Caramel": "200" });
  // ₦160 of sugar + 200 g × ₦2.
  await expect(page.getByText("₦560", { exact: true })).toBeVisible();
  await expectAccessible(page);
  await shot(page, "sections");
  await next(page, "Overhead & price");
  await save(page, "Caramel Cake");
  await expect(card(page, "Caramel Cake")).toContainText("1,000 g · ₦560 · ₦0.56/g");
  await expect
    .poll(async () =>
      must(
        await admin()
          .from("recipe_sections")
          .select("name, position, recipes!inner(name)")
          .eq("recipes.name", "Caramel Cake")
          .eq("business_id", user.businessId)
          .order("position"),
      ).map((section) => section.name),
    )
    .toEqual([null, "Salted Caramel"]);

  // Counted in pieces: "each".
  await page.getByRole("link", { name: "New recipe" }).click();
  await basics(page, { name: "Sugar Cookies", count: "24" });
  await next(page, "Ingredients");
  await page.getByRole("button", { name: "Add ingredients" }).click();
  await tick(page, ["Sugar"], "Add 1 ingredient");
  await amounts(page, { Sugar: "300" });
  await next(page, "Overhead & price");
  await expect(page.getByText("Cost each")).toBeVisible();
  await save(page, "Sugar Cookies");
  await expect(card(page, "Sugar Cookies")).toContainText("24 pcs · ₦480 · ₦20 each");
});

test("an ingredient made inside Add ingredients, with no price, makes the recipe incomplete", async ({ page }) => {
  await signInDirectly(page);
  await startRecipe(page);
  await basics(page, { name: "Salted Caramel Cake", weight: "1,000" });
  await next(page, "Ingredients");

  await page.getByRole("button", { name: "Add ingredients" }).click();
  await sheet(page).getByRole("button", { name: "New ingredient" }).click();
  await expect(sheet(page).getByRole("heading", { name: "New ingredient" })).toBeVisible();
  await sheet(page).getByLabel("Name").fill("Corn syrup");
  await sheet(page).getByRole("button", { name: "Save" }).click();
  await expect(sheet(page).getByRole("heading", { name: "Restock — Corn syrup" })).toBeVisible();
  await sheet(page).getByRole("button", { name: "Close" }).click();

  // Back in Add ingredients, ticked, with "add price".
  await expect(sheet(page).getByRole("heading", { name: "Add ingredients" })).toBeVisible();
  await expect(sheet(page).getByLabel("Corn syrup", { exact: true })).toBeChecked();
  await expect(sheet(page)).toContainText("add price");
  await sheet(page).getByRole("button", { name: "Add 1 ingredient" }).click();
  await amounts(page, { "Corn syrup": "5" });
  await expect(page.getByText("Ingredient cost · 1 has no price")).toBeVisible();
  await next(page, "Overhead & price");
  await expect(page.getByText("1 ingredient has no price, so these totals are incomplete.")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "incomplete");
  await save(page, "Salted Caramel Cake");
  await expect(card(page, "Salted Caramel Cake")).toContainText("incomplete");
  await expect(card(page, "Salted Caramel Cake")).toContainText("1,000 g · 1 ingredient has no price");
});

test("each step says what's missing, with the boxes marked in red", async ({ page }) => {
  // Vanilla Cake (in Cakes) with Flour, already saved.
  const user = await createTestUser();
  await seed(user);
  await signInDirectly(page, user);
  await expect(card(page, "Vanilla Cake")).toBeVisible();
  await startRecipe(page);

  await basics(page, { name: "vanilla cake" });
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("You already have Vanilla Cake.")).toBeVisible();
  await expect(page.getByText("Type the weight, like 1,500.")).toBeVisible();
  await basics(page, { name: "Lemon Cake", weight: "900" });
  await next(page, "Ingredients");

  await page.getByRole("button", { name: "Add ingredients" }).click();
  await tick(page, ["Flour"], "Add 1 ingredient");
  // The new line has the cursor.
  await expect(page.getByLabel("Flour amount")).toBeFocused();
  await page.getByRole("button", { name: "Add section" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Fill in the boxes marked in red.")).toBeVisible();
  await expect(page.getByLabel("Flour amount")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Flour amount")).toBeFocused();
  await expect(page.getByText("Name this section, like Crumble.")).toBeVisible();
  await expectAccessible(page);
  await shot(page, "missing");

  // Removing a section with ingredients asks first.
  await page.getByLabel("Section name").fill("Crumble");
  await page.getByRole("button", { name: "Add ingredients" }).last().click();
  await tick(page, ["Flour"], "Add 1 ingredient");
  await page.getByRole("button", { name: "Remove Crumble" }).click();
  const remove = page.getByRole("alertdialog", { name: "Remove Crumble?" });
  await expect(remove).toContainText("Its 1 ingredient will be removed too.");
  await remove.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Remove Crumble" }).click();
  await remove.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByLabel("Section name")).toHaveCount(0);

  await amounts(page, { Flour: "350" });
  await expect(page.getByText("Fill in the boxes marked in red.")).toHaveCount(0);
  await next(page, "Overhead & price");

  await page.getByRole("button", { name: "Add overhead item" }).click();
  await tick(page, ["Gas"], "Add 1 item");
  await page.getByRole("radio", { name: "Margin %" }).click();
  await page.getByLabel("Margin").fill("100");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByLabel("Gas amount")).toHaveAttribute("aria-invalid", "true");
  await amounts(page, { Gas: "0" });
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByText("Margin must be under 100%.")).toBeVisible();
  await page.getByRole("radio", { name: "Fixed profit" }).click();
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByText("Type the profit, like 2,000.")).toBeVisible();
  await page.getByLabel("Profit").fill("2,000");
  await save(page, "Lemon Cake");
});

test("an unfinished recipe is kept as a draft, opens where she left it, and can be discarded", async ({ page }) => {
  await signInDirectly(page);
  await startRecipe(page);
  await basics(page, { name: "Lemon Cake", weight: "900" });
  await next(page, "Ingredients");

  // × asks; tapping outside goes back to the recipe.
  await page.getByRole("button", { name: "Close" }).click();
  const leave = page.getByRole("alertdialog", { name: "Keep Lemon Cake as a draft?" });
  await expect(leave).toBeVisible();
  await expectAccessible(page);
  await shot(page, "leave");
  await page.keyboard.press("Escape");
  await expect(leave).toBeHidden();
  await expect(page.getByRole("heading", { name: "Ingredients", exact: true })).toBeVisible();

  // A reload mid-recipe keeps it.
  await page.waitForURL(/\?draft=/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ingredients", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Lemon Cake", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Close" }).click();
  await leave.getByRole("button", { name: "Keep as draft" }).click();
  await expect(page.getByRole("heading", { name: "Recipes", level: 1 })).toBeVisible();
  await expect(card(page, "Lemon Cake")).toContainText("Draft");
  await expect(card(page, "Lemon Cake")).toContainText("Not finished");
  await shot(page, "draft-card");

  // New recipe always starts blank.
  await startRecipe(page);
  await expect(page.getByLabel("Recipe name")).toHaveValue("");
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("heading", { name: "Recipes", level: 1 })).toBeVisible();

  // Opening the draft goes back to step 2; Discard throws it away.
  await card(page, "Lemon Cake").getByRole("button").click();
  await expect(page.getByRole("heading", { name: "Ingredients", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByLabel("Recipe name")).toHaveValue("Lemon Cake");
  await page.getByRole("button", { name: "Close" }).click();
  await leave.getByRole("button", { name: "Discard" }).click();
  await expect(page.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
});

test("chips and search find recipes and drafts", async ({ page }) => {
  const user = await createTestUser();
  await seed(user);
  await signInDirectly(page, user);
  await expect(card(page, "Vanilla Cake")).toBeVisible();

  // A draft with no category.
  await startRecipe(page);
  await basics(page, { name: "Lemon Cake" });
  await page.waitForURL(/\?draft=/);
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Keep as draft" }).click();

  const chip = (name: string) => page.getByRole("button", { name, exact: true });
  await expect(page.getByRole("listitem")).toHaveText([/^Lemon Cake/, /^Vanilla Cake/]);
  await chip("Cakes").click();
  await expect(page.getByRole("listitem")).toHaveText([/^Vanilla Cake/]);
  await chip("Uncategorised").click();
  await expect(page.getByRole("listitem")).toHaveText([/^Lemon Cake/]);
  await chip("All").click();
  await page.getByRole("searchbox", { name: "Search recipes" }).fill("VAN");
  await expect(page.getByRole("listitem")).toHaveText([/^Vanilla Cake/]);
  await expectAccessible(page);
});

test("a recipe made offline syncs when the phone is back online", async ({ page, context }) => {
  const user: TestUser = await createTestUser();
  await addIngredients(user, [VANILLA_CAKE_INGREDIENTS[1]]);
  await signInDirectly(page, user);

  await context.setOffline(true);
  await startRecipe(page);
  await basics(page, { name: "Plain Sponge", weight: "350" });
  await next(page, "Ingredients");
  await page.getByRole("button", { name: "Add ingredients" }).click();
  await tick(page, ["Flour"], "Add 1 ingredient");
  await amounts(page, { Flour: "350" });
  await next(page, "Overhead & price");
  await page.getByRole("button", { name: "Add overhead item" }).click();
  await tick(page, ["Gas"], "Add 1 item");
  await amounts(page, { Gas: "500" });
  await save(page, "Plain Sponge");
  // ₦420 of flour + ₦500 of gas.
  await expect(card(page, "Plain Sponge")).toContainText("350 g · ₦920");
  await expect(page.getByText(/changes? waiting/)).toBeVisible();

  await context.setOffline(false);
  await expect
    .poll(async () => {
      const [recipe] = must(await admin().from("recipes").select("id").eq("business_id", user.businessId));
      if (!recipe) return null;
      const sections = must(await admin().from("recipe_sections").select("id").eq("recipe_id", recipe.id));
      const lines = must(await admin().from("recipe_lines").select("amount").eq("recipe_id", recipe.id));
      const overhead = must(await admin().from("recipe_overhead_lines").select("amount_minor").eq("recipe_id", recipe.id));
      return [sections.length, lines, overhead];
    })
    .toEqual([1, [{ amount: 350 }], [{ amount_minor: 50_000 }]]);
});

test("dragging a line's grip moves it either way, and the order is saved", async ({ page }) => {
  const user = await createTestUser();
  await addIngredients(user, VANILLA_CAKE_INGREDIENTS.slice(0, 3));
  await signInDirectly(page, user);
  await startRecipe(page);
  await basics(page, { name: "Plain Cake", weight: "750" });
  await next(page, "Ingredients");
  await page.getByRole("button", { name: "Add ingredients" }).click();
  await tick(page, ["Sugar", "Flour", "Baking powder"], "Add 3 ingredients");
  const order = () =>
    page.getByRole("textbox", { name: / amount$/ }).evaluateAll((boxes) => boxes.map((box) => box.getAttribute("aria-label")));
  const grip = (name: string) => page.getByRole("button", { name: `Move ${name} up or down` });
  // A line's grip, dragged in small steps (as a finger would) to just past
  // the top or bottom of another line.
  async function drag(name: string, onto: string, side: "top" | "bottom") {
    const from = await grip(name).boundingBox();
    const row = await page.getByRole("textbox", { name: `${onto} amount` }).boundingBox();
    if (!from || !row) throw new Error("no grips");
    const x = from.x + from.width / 2;
    await page.mouse.move(x, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, side === "top" ? row.y - 8 : row.y + row.height + 8, { steps: 12 });
    await page.mouse.up();
  }
  expect(await order()).toEqual(["Sugar amount", "Flour amount", "Baking powder amount"]);

  await drag("Sugar", "Baking powder", "bottom");
  await expect.poll(order).toEqual(["Flour amount", "Baking powder amount", "Sugar amount"]);
  // The bottom line up to the top (the case our own code got wrong).
  await drag("Sugar", "Flour", "top");
  await expect.poll(order).toEqual(["Sugar amount", "Flour amount", "Baking powder amount"]);
  // The middle line up one.
  await drag("Flour", "Sugar", "top");
  await expect.poll(order).toEqual(["Flour amount", "Sugar amount", "Baking powder amount"]);

  // Keyboard: Space picks it up, ↑/↓ move it, Space drops it; Esc puts it back.
  await grip("Baking powder").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Space");
  await expect.poll(order).toEqual(["Flour amount", "Baking powder amount", "Sugar amount"]);
  await grip("Flour").focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect.poll(order).toEqual(["Flour amount", "Baking powder amount", "Sugar amount"]);
  await expectAccessible(page);

  // The draft keeps the order (saved 400ms after the last change).
  await page.waitForURL(/\?draft=/);
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ingredients", exact: true })).toBeVisible();
  expect(await order()).toEqual(["Flour amount", "Baking powder amount", "Sugar amount"]);
});
