import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PowerSyncDatabase } from "@powersync/node";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { VANILLA_CAKE_INGREDIENTS, VANILLA_CAKE_OVERHEAD } from "../../../tests/fixtures/vanilla-cake";
import { createCostBook } from "@/lib/calc/recipes";
import { formatMoney } from "@/lib/format";
import { blankDraft, type RecipeDraft, recipeRows } from "@/lib/recipes";
import { addCategory } from "./categories";
import { deleteDraft, loadDraft, saveDraft } from "./drafts";
import type { IngredientRow } from "./ingredients";
import { addOverheadItem } from "./overhead";
import { type RecipeRow, saveNewRecipe, toCostSnapshot } from "./recipes";
import { AppSchema } from "./schema";

// A database on this machine only (never connected), with the app's schema:
// what the phone does offline when she saves a recipe or keeps a draft.

const BUSINESS = "b0000000-0000-4000-8000-000000000001";
const JAN = new Date("2026-01-10T09:00:00.000Z");
const FEB = new Date("2026-02-10T09:00:00.000Z");

let folder: string;
let powersync: PowerSyncDatabase;
let db: AbstractPowerSyncDatabase;

const TABLES = [
  "categories",
  "overhead_items",
  "ingredients",
  "recipes",
  "recipe_sections",
  "recipe_lines",
  "recipe_overhead_lines",
  "recipe_drafts",
];

async function clearUploads() {
  for (let batch = await db.getCrudBatch(1000); batch; batch = await db.getCrudBatch(1000)) await batch.complete();
}

async function uploads() {
  const batch = await db.getCrudBatch(1000);
  return batch?.crud.map((entry) => [entry.table, entry.op]) ?? [];
}

/** Vanilla Cake's ingredients and overhead items in the business, by name. */
async function addVanillaCakeStock() {
  const ids: Record<string, string> = {};
  for (const item of VANILLA_CAKE_INGREDIENTS) {
    ids[item.name] = crypto.randomUUID();
    await db.execute(
      `INSERT INTO ingredients (id, business_id, name, unit, pack_price_minor, pack_size, pack_size_unit)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ids[item.name], BUSINESS, item.name, item.unit, item.priceMinor, item.size, item.unit],
    );
  }
  for (const item of VANILLA_CAKE_OVERHEAD) ids[item.name] = await addOverheadItem(db, { businessId: BUSINESS, name: item.name });
  return ids;
}

function vanillaCakeDraft(ids: Record<string, string>): RecipeDraft {
  return {
    ...blankDraft({ method: "markup", percent: 50 }),
    name: "Vanilla Cake",
    yieldWeight: "1,500",
    sections: [
      {
        key: crypto.randomUUID(),
        name: "",
        lines: VANILLA_CAKE_INGREDIENTS.map((item) => ({
          key: crypto.randomUUID(),
          ingredientId: ids[item.name],
          subRecipeId: null,
          amount: String(item.amount),
        })),
      },
    ],
    overhead: VANILLA_CAKE_OVERHEAD.map((item) => ({
      key: crypto.randomUUID(),
      overheadItemId: ids[item.name],
      amount: String(item.amountMinor / 100),
    })),
  };
}

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), "butterlogs-recipes-"));
  powersync = new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename: "test.db", dbLocation: folder } });
  db = powersync as unknown as AbstractPowerSyncDatabase;
  await powersync.init();
});

beforeEach(async () => {
  await db.writeTransaction(async (tx) => {
    for (const table of TABLES) await tx.execute(`DELETE FROM ${table}`);
  });
  await clearUploads();
});

afterAll(async () => {
  await powersync?.close();
  await rm(folder, { recursive: true, force: true });
});

describe("saveNewRecipe", () => {
  it("writes the recipe, its sections, lines and overhead in one go, and the draft goes", async () => {
    const ids = await addVanillaCakeStock();
    await clearUploads();
    const draft = vanillaCakeDraft(ids);
    const draftId = crypto.randomUUID();
    await saveDraft(db, { id: draftId, businessId: BUSINESS, draft, step: 3 });

    const recipeId = crypto.randomUUID();
    await saveNewRecipe(db, { rows: recipeRows(draft, { recipeId, businessId: BUSINESS }), draftId, now: JAN });

    expect(await db.get<RecipeRow>("SELECT * FROM recipes WHERE id = ?", [recipeId])).toMatchObject({
      name: "Vanilla Cake",
      yield_type: "weight",
      yield_weight_g: 1500,
      pricing_method: "markup",
      pricing_percent: 50,
      created_at: JAN.toISOString(),
    });
    expect(await db.getAll("SELECT name, position FROM recipe_sections")).toEqual([{ name: null, position: 1 }]);
    expect(await db.getAll("SELECT amount FROM recipe_lines ORDER BY position")).toEqual(
      VANILLA_CAKE_INGREDIENTS.map((item) => ({ amount: item.amount })),
    );
    expect((await db.getAll("SELECT * FROM recipe_overhead_lines")).length).toBe(9);
    expect(await loadDraft(db, draftId)).toBeNull();
  });

  it("queues the uploads parents first, so the server's keys accept each row", async () => {
    const ids = await addVanillaCakeStock();
    await clearUploads();
    const draft = vanillaCakeDraft(ids);
    await saveNewRecipe(db, {
      rows: recipeRows(draft, { recipeId: crypto.randomUUID(), businessId: BUSINESS }),
      draftId: "none",
    });
    const tables = (await uploads()).map(([table]) => table);
    expect(tables).toEqual([
      "recipes",
      "recipe_sections",
      ...Array(9).fill("recipe_lines"),
      ...Array(9).fill("recipe_overhead_lines"),
    ]);
  });

  it("is costed the same as her sheet once saved: ₦10,287 (PRD §9)", async () => {
    const ids = await addVanillaCakeStock();
    const recipeId = crypto.randomUUID();
    await saveNewRecipe(db, {
      rows: recipeRows(vanillaCakeDraft(ids), { recipeId, businessId: BUSINESS }),
      draftId: "none",
    });
    const { costRecipes, costIngredients } = toCostSnapshot(
      await db.getAll("SELECT * FROM recipes"),
      await db.getAll("SELECT * FROM recipe_lines ORDER BY position"),
      await db.getAll("SELECT * FROM recipe_overhead_lines ORDER BY position"),
      await db.getAll<IngredientRow>("SELECT * FROM ingredients"),
    );
    const cost = createCostBook(costIngredients, costRecipes).recipeCost(costRecipes[0]);
    expect(formatMoney(cost.ingredientsMinor, "NGN")).toBe("₦4,937");
    expect(formatMoney(cost.totalMinor, "NGN")).toBe("₦10,287");
  });
});

describe("toCostSnapshot", () => {
  it("gives a recipe with no lines or overhead empty lists, and empty amounts as 0", () => {
    const recipe = { id: "r", yield_type: "count", yield_count: 24 } as RecipeRow;
    const { costRecipes } = toCostSnapshot([recipe], [{ id: "l", recipe_id: "x", amount: null } as never], [], []);
    expect(costRecipes).toEqual([
      { id: "r", deletedAt: undefined, yieldType: "count", yieldWeightG: undefined, yieldCount: 24, lines: [], overheadMinor: [] },
    ]);
  });
});

describe("drafts", () => {
  it("adds a draft, then keeps it up to date, without ever queueing an upload", async () => {
    const id = crypto.randomUUID();
    const draft = { ...blankDraft({ method: "markup", percent: 50 }), name: " Lemon Cake " };
    await saveDraft(db, { id, businessId: BUSINESS, draft, step: 1, now: JAN });
    await saveDraft(db, { id, businessId: BUSINESS, draft: { ...draft, categoryId: "cakes" }, step: 2, now: FEB });

    expect(await db.get("SELECT name, category_id, step, created_at, updated_at FROM recipe_drafts WHERE id = ?", [id])).toEqual({
      name: "Lemon Cake",
      category_id: "cakes",
      step: 2,
      created_at: JAN.toISOString(),
      updated_at: FEB.toISOString(),
    });
    expect(await loadDraft(db, id)).toEqual({ draft: { ...draft, categoryId: "cakes" }, step: 2 });
    expect(await uploads()).toEqual([]);
  });

  it("is gone once discarded", async () => {
    const id = crypto.randomUUID();
    await saveDraft(db, { id, businessId: BUSINESS, draft: blankDraft({ method: null, percent: null }), step: 1 });
    await deleteDraft(db, id);
    expect(await loadDraft(db, id)).toBeNull();
  });
});

describe("addCategory and addOverheadItem", () => {
  it("add at the end of her list, trimmed, and queue the upload", async () => {
    await db.execute("INSERT INTO categories (id, business_id, name, position) VALUES (uuid(), ?, 'Cakes', 4)", [BUSINESS]);
    await clearUploads();
    const id = await addCategory(db, { businessId: BUSINESS, name: " Pastries " });
    expect(await db.get("SELECT name, position FROM categories WHERE id = ?", [id])).toEqual({ name: "Pastries", position: 5 });
    expect(await uploads()).toEqual([["categories", "PUT"]]);

    const first = await addOverheadItem(db, { businessId: BUSINESS, name: "Gas" });
    const second = await addOverheadItem(db, { businessId: BUSINESS, name: " Goop " });
    expect(await db.getAll("SELECT id, name, position FROM overhead_items ORDER BY position")).toEqual([
      { id: first, name: "Gas", position: 1 },
      { id: second, name: "Goop", position: 2 },
    ]);
  });
});
