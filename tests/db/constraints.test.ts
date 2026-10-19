import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestUser, must, seed, type Seed, type TestUser } from "./helpers";

// Composite foreign keys and the server checks that can never fail (PRD §6).
let a: TestUser;
let seedA: Seed;
let seedB: Seed;

beforeAll(async () => {
  let b: TestUser;
  [a, b] = await Promise.all([createTestUser(), createTestUser()]);
  [seedA, seedB] = await Promise.all([seed(a), seed(b)]);
});

function line(overrides: Record<string, unknown>) {
  return {
    id: randomUUID(),
    business_id: a.businessId,
    recipe_id: seedA.recipes,
    section_id: seedA.recipe_sections,
    position: 2,
    amount: 100,
    ...overrides,
  };
}

describe("composite foreign keys keep references inside one business", () => {
  it("blocks a line using another business's ingredient", async () => {
    const result = await a.client.from("recipe_lines").insert(line({ ingredient_id: seedB.ingredients }));
    expect(result.error?.code).toBe("23503");
  });

  it("blocks a line using another business's recipe as a sub-recipe", async () => {
    const result = await a.client.from("recipe_lines").insert(line({ sub_recipe_id: seedB.recipes }));
    expect(result.error?.code).toBe("23503");
  });

  it("blocks an overhead line using another business's overhead item", async () => {
    const result = await a.client.from("recipe_overhead_lines").insert({
      id: randomUUID(),
      business_id: a.businessId,
      recipe_id: seedA.recipes,
      overhead_item_id: seedB.overhead_items,
      amount_minor: 0,
      position: 2,
    });
    expect(result.error?.code).toBe("23503");
  });

  it("blocks a recipe in another business's category", async () => {
    const result = await a.client.from("recipes").insert({
      id: randomUUID(),
      business_id: a.businessId,
      name: "Stray",
      category_id: seedB.categories,
      yield_type: "count",
      yield_count: 12,
    });
    expect(result.error?.code).toBe("23503");
  });
});

describe("checks", () => {
  it("a line has exactly one of ingredient and sub-recipe", async () => {
    const both = await a.client
      .from("recipe_lines")
      .insert(line({ ingredient_id: seedA.ingredients, sub_recipe_id: seedA.recipes }));
    expect(both.error?.code).toBe("23514");
    const neither = await a.client.from("recipe_lines").insert(line({}));
    expect(neither.error?.code).toBe("23514");
  });

  it("a line amount is above 0", async () => {
    const result = await a.client
      .from("recipe_lines")
      .insert(line({ ingredient_id: seedA.ingredients, amount: 0 }));
    expect(result.error?.code).toBe("23514");
  });

  it("an overhead amount is 0 or more", async () => {
    const base = {
      business_id: a.businessId,
      recipe_id: seedA.recipes,
      overhead_item_id: seedA.overhead_items,
      position: 2,
    };
    const negative = await a.client
      .from("recipe_overhead_lines")
      .insert({ ...base, id: randomUUID(), amount_minor: -1 });
    expect(negative.error?.code).toBe("23514");
    must(await a.client.from("recipe_overhead_lines").insert({ ...base, id: randomUUID(), amount_minor: 0 }));
  });

  it("yield type and pricing method are known values", async () => {
    const recipe = { business_id: a.businessId, name: "Odd", yield_type: "weight", yield_weight_g: 100 };
    const yieldType = await a.client
      .from("recipes")
      .insert({ ...recipe, id: randomUUID(), yield_type: "volume" });
    expect(yieldType.error?.code).toBe("23514");
    const method = await a.client
      .from("recipes")
      .insert({ ...recipe, id: randomUUID(), pricing_method: "discount" });
    expect(method.error?.code).toBe("23514");
  });
});

describe("real deletes", () => {
  it("deleting a category makes its recipes Uncategorised", async () => {
    const categoryId = randomUUID();
    const recipeId = randomUUID();
    must(
      await a.client
        .from("categories")
        .insert({ id: categoryId, business_id: a.businessId, name: "Pies", position: 2 }),
    );
    must(
      await a.client.from("recipes").insert({
        id: recipeId,
        business_id: a.businessId,
        name: "Meat Pie",
        category_id: categoryId,
        yield_type: "count",
        yield_count: 10,
      }),
    );

    must(await a.client.from("categories").delete().eq("id", categoryId));

    const [recipe] = must(
      await a.client.from("recipes").select("category_id, business_id").eq("id", recipeId),
    );
    expect(recipe).toEqual({ category_id: null, business_id: a.businessId });
  });

  it("deleting a section deletes its lines", async () => {
    const sectionId = randomUUID();
    const lineId = randomUUID();
    must(
      await a.client.from("recipe_sections").insert({
        id: sectionId,
        business_id: a.businessId,
        recipe_id: seedA.recipes,
        name: "Frosting",
        position: 2,
      }),
    );
    must(
      await a.client
        .from("recipe_lines")
        .insert(line({ id: lineId, section_id: sectionId, ingredient_id: seedA.ingredients })),
    );

    must(await a.client.from("recipe_sections").delete().eq("id", sectionId));

    const lines = must(await a.client.from("recipe_lines").select("id").eq("id", lineId));
    expect(lines).toEqual([]);
  });
});
