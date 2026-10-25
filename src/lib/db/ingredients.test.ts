import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PowerSyncDatabase } from "@powersync/node";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { IngredientValues, RestockValues } from "@/lib/ingredients";
import { deleteIngredient, type IngredientRow, recipesUsing, restockIngredient, saveIngredient } from "./ingredients";
import { AppSchema } from "./schema";

// A database on this machine only (never connected), with the app's schema:
// what the phone does in one transaction, offline.

const BUSINESS = "b0000000-0000-4000-8000-000000000001";
const JAN = new Date("2026-01-10T09:00:00.000Z");
const FEB = new Date("2026-02-10T09:00:00.000Z");

let folder: string;
let powersync: PowerSyncDatabase;
// The node database implements the same interface the web one does.
let db: AbstractPowerSyncDatabase;

const flour: IngredientValues = { name: "Flour", unit: "g", notes: null };
const quarterBag: RestockValues = { pack_price_minor: 1_500_000, pack_size: 12.5, pack_size_unit: "kg" };

const ingredient = (id: string) => db.get<IngredientRow>("SELECT * FROM ingredients WHERE id = ?", [id]);

async function addLine(recipeId: string, ingredientId: string, amount: number) {
  await db.execute(
    "INSERT INTO recipe_lines (id, business_id, recipe_id, ingredient_id, amount) VALUES (uuid(), ?, ?, ?, ?)",
    [BUSINESS, recipeId, ingredientId, amount],
  );
}

async function addRecipe(name: string, deletedAt: string | null = null) {
  const id = crypto.randomUUID();
  await db.execute("INSERT INTO recipes (id, business_id, name, deleted_at) VALUES (?, ?, ?, ?)", [
    id,
    BUSINESS,
    name,
    deletedAt,
  ]);
  return id;
}

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), "butterlogs-ingredients-"));
  powersync = new PowerSyncDatabase({ schema: AppSchema, database: { dbFilename: "test.db", dbLocation: folder } });
  db = powersync as unknown as AbstractPowerSyncDatabase;
  await powersync.init();
});

beforeEach(async () => {
  await db.writeTransaction(async (tx) => {
    for (const table of ["ingredients", "recipes", "recipe_lines"]) await tx.execute(`DELETE FROM ${table}`);
  });
  // Start each test with nothing waiting to upload.
  for (let batch = await db.getCrudBatch(1000); batch; batch = await db.getCrudBatch(1000)) await batch.complete();
});

afterAll(async () => {
  await powersync?.close();
  await rm(folder, { recursive: true, force: true });
});

describe("saveIngredient: adding", () => {
  it("stores the row in the business with a phone-made id and no price yet", async () => {
    const id = await saveIngredient(db, { businessId: BUSINESS, existing: null, values: flour, now: JAN });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(await ingredient(id)).toMatchObject({
      business_id: BUSINESS,
      name: "Flour",
      unit: "g",
      pack_price_minor: null,
      pack_size: null,
      pack_size_unit: null,
      notes: null,
      price_updated_at: null,
      created_at: JAN.toISOString(),
      deleted_at: null,
    });
  });

  it("queues the new row for upload", async () => {
    await saveIngredient(db, { businessId: BUSINESS, existing: null, values: flour });
    const batch = await db.getCrudBatch();
    expect(batch?.crud.map((entry) => [entry.table, entry.op])).toEqual([["ingredients", "PUT"]]);
    await batch?.complete();
  });
});

describe("saveIngredient: editing", () => {
  it("saves the name, unit and notes and leaves the price alone", async () => {
    const id = await saveIngredient(db, { businessId: BUSINESS, existing: null, values: flour, now: JAN });
    await restockIngredient(db, { id, values: quarterBag, now: JAN });

    await saveIngredient(db, {
      businessId: BUSINESS,
      existing: await ingredient(id),
      values: { ...flour, name: "Plain flour", notes: "Bulk bag" },
      now: FEB,
    });
    expect(await ingredient(id)).toMatchObject({
      name: "Plain flour",
      notes: "Bulk bag",
      pack_price_minor: 1_500_000,
      pack_size: 12.5,
      pack_size_unit: "kg",
      price_updated_at: JAN.toISOString(),
      updated_at: FEB.toISOString(),
    });
  });

  it("converts every recipe line for it when the measuring unit changes, and no others", async () => {
    const id = await saveIngredient(db, { businessId: BUSINESS, existing: null, values: flour, now: JAN });
    await restockIngredient(db, { id, values: quarterBag, now: JAN });
    const sugar = await saveIngredient(db, { businessId: BUSINESS, existing: null, values: { ...flour, name: "Sugar" } });
    const cake = await addRecipe("Vanilla Cake");
    await addLine(cake, id, 350);
    await addLine(cake, id, 25);
    await addLine(cake, sugar, 380);

    await saveIngredient(db, { businessId: BUSINESS, existing: await ingredient(id), values: { ...flour, unit: "kg" }, now: FEB });

    const lines = await db.getAll<{ ingredient_id: string; amount: number }>(
      "SELECT ingredient_id, amount FROM recipe_lines ORDER BY amount",
    );
    expect(lines).toEqual([
      { ingredient_id: id, amount: 0.025 },
      { ingredient_id: id, amount: 0.35 },
      { ingredient_id: sugar, amount: 380 },
    ]);
    // The unit isn't a price change.
    expect((await ingredient(id)).price_updated_at).toBe(JAN.toISOString());
  });

  it("leaves recipe lines alone when the unit stays the same", async () => {
    const id = await saveIngredient(db, { businessId: BUSINESS, existing: null, values: flour });
    await addLine(await addRecipe("Vanilla Cake"), id, 350);
    await saveIngredient(db, { businessId: BUSINESS, existing: await ingredient(id), values: { ...flour, name: "Flour (bulk)" } });
    expect((await db.get<{ amount: number }>("SELECT amount FROM recipe_lines")).amount).toBe(350);
  });
});

describe("restockIngredient", () => {
  it("stores the amount, its unit and the price, and moves 'Price updated' every time", async () => {
    const id = await saveIngredient(db, { businessId: BUSINESS, existing: null, values: flour, now: JAN });

    await restockIngredient(db, { id, values: quarterBag, now: JAN });
    expect(await ingredient(id)).toMatchObject({ ...quarterBag, price_updated_at: JAN.toISOString() });

    // The same bag at the same price: she confirmed it today.
    await restockIngredient(db, { id, values: quarterBag, now: FEB });
    expect(await ingredient(id)).toMatchObject({ ...quarterBag, price_updated_at: FEB.toISOString() });

    // A full bag this time.
    const fullBag: RestockValues = { pack_price_minor: 5_600_000, pack_size: 50, pack_size_unit: "kg" };
    await restockIngredient(db, { id, values: fullBag, now: FEB });
    expect(await ingredient(id)).toMatchObject({ ...fullBag, name: "Flour", unit: "g" });
  });

  it("keeps ₦0 as a real price", async () => {
    const id = await saveIngredient(db, { businessId: BUSINESS, existing: null, values: { ...flour, name: "Water", unit: "ml" } });
    await restockIngredient(db, { id, values: { pack_price_minor: 0, pack_size: 1, pack_size_unit: "l" } });
    expect((await ingredient(id)).pack_price_minor).toBe(0);
  });

  it("queues the change for upload", async () => {
    const id = await saveIngredient(db, { businessId: BUSINESS, existing: null, values: flour });
    for (let batch = await db.getCrudBatch(1000); batch; batch = await db.getCrudBatch(1000)) await batch.complete();

    await restockIngredient(db, { id, values: quarterBag });
    const batch = await db.getCrudBatch();
    expect(batch?.crud.map((entry) => [entry.table, entry.op])).toEqual([["ingredients", "PATCH"]]);
    await batch?.complete();
  });
});

describe("deleteIngredient", () => {
  it("soft-deletes: the row stays, marked deleted", async () => {
    const id = await saveIngredient(db, { businessId: BUSINESS, existing: null, values: flour });
    await deleteIngredient(db, id, FEB);
    expect((await ingredient(id)).deleted_at).toBe(FEB.toISOString());
  });
});

describe("recipesUsing", () => {
  it("lists the recipes with a line for it once each, A to Z, leaving out deleted recipes", async () => {
    const id = await saveIngredient(db, { businessId: BUSINESS, existing: null, values: flour });
    const vanilla = await addRecipe("Vanilla Cake");
    const chocolate = await addRecipe("chocolate Cake");
    const gone = await addRecipe("Old Sponge", "2026-01-01T00:00:00.000Z");
    await addLine(vanilla, id, 350);
    await addLine(vanilla, id, 20);
    await addLine(chocolate, id, 300);
    await addLine(gone, id, 100);

    expect((await recipesUsing(db, id)).map((recipe) => recipe.name)).toEqual(["chocolate Cake", "Vanilla Cake"]);
  });
});
