import { describe, expect, it } from "vitest";
import {
  VANILLA_CAKE_INGREDIENTS,
  VANILLA_CAKE_OVERHEAD,
  VANILLA_CAKE_YIELD_G,
} from "../../../tests/fixtures/vanilla-cake";
import { formatMoney } from "../format";
import { priceFor } from "./pricing";
import { type CostIngredient, type CostRecipe, createCostBook, createsLoop, subRecipeUnit } from "./recipes";

const ingredients: CostIngredient[] = VANILLA_CAKE_INGREDIENTS.map((item) => ({
  id: item.name,
  unit: item.unit,
  packPriceMinor: item.priceMinor,
  packSize: item.size,
  packSizeUnit: item.unit,
  deletedAt: null,
}));

const recipe = (overrides: Partial<CostRecipe> = {}): CostRecipe => ({
  id: "vanilla",
  deletedAt: null,
  yieldType: "weight",
  yieldWeightG: VANILLA_CAKE_YIELD_G,
  yieldCount: null,
  lines: VANILLA_CAKE_INGREDIENTS.map((item) => ({ ingredientId: item.name, subRecipeId: null, amount: item.amount })),
  overheadMinor: VANILLA_CAKE_OVERHEAD.map((item) => item.amountMinor),
  ...overrides,
});

// PRD §9: Vanilla Cake at ×1.
describe("PRD §9 fixture: Vanilla Cake ×1", () => {
  const vanilla = recipe();
  const cost = createCostBook(ingredients, [vanilla]).recipeCost(vanilla);

  it("ingredients ₦4,937 · overhead ₦5,350 · total ₦10,287 · ₦6.86/g", () => {
    expect(cost.ingredientsMinor).toBeCloseTo(493_728.571, 2);
    expect(formatMoney(cost.ingredientsMinor, "NGN")).toBe("₦4,937");
    expect(cost.overheadMinor).toBe(535_000);
    expect(formatMoney(cost.totalMinor, "NGN")).toBe("₦10,287");
    expect(cost.perGramMinor).toBeCloseTo(685.819, 2);
    expect(cost.missing).toBe(0);
  });

  it("at markup 50% the price is ₦15,431 and the profit ₦5,144", () => {
    const price = priceFor(cost.totalMinor, { method: "markup", percent: 50, amountMinor: null });
    expect(formatMoney(price?.price ?? 0, "NGN")).toBe("₦15,431");
    expect(formatMoney(price?.profit ?? 0, "NGN")).toBe("₦5,144");
  });
});

describe("recipeCost", () => {
  it("counts a line with no price as missing and adds nothing for it", () => {
    const unpriced = ingredients.map((item) => (item.id === "Sugar" ? { ...item, packPriceMinor: null } : item));
    const vanilla = recipe();
    const cost = createCostBook(unpriced, [vanilla]).recipeCost(vanilla);
    expect(cost.missing).toBe(1);
    expect(cost.ingredientsMinor).toBeCloseTo(493_728.571 - 60_800, 2);
  });

  it("keeps ₦0 as a real price, not missing", () => {
    const free = ingredients.map((item) => (item.id === "Salt" ? { ...item, packPriceMinor: 0 } : item));
    const vanilla = recipe();
    expect(createCostBook(free, [vanilla]).recipeCost(vanilla).missing).toBe(0);
  });

  it("counts a deleted or unknown ingredient as missing", () => {
    const deleted = ingredients.map((item) => (item.id === "Flour" ? { ...item, deletedAt: "2026-10-01" } : item));
    const vanilla = recipe({ lines: [...recipe().lines, { ingredientId: "Nope", subRecipeId: null, amount: 1 }] });
    expect(createCostBook(deleted, [vanilla]).recipeCost(vanilla).missing).toBe(2);
    const noId = recipe({ lines: [{ ingredientId: null, subRecipeId: null, amount: 1 }] });
    expect(createCostBook(ingredients, []).recipeCost(noId).missing).toBe(1);
    // A row from the server with no measuring unit can't be costed.
    const noUnit = ingredients.map((item) => (item.id === "Milk" ? { ...item, unit: null } : item));
    expect(createCostBook(noUnit, []).recipeCost(recipe()).missing).toBe(1);
  });

  it("gives the cost each for a count yield, and no per-gram cost without a weight", () => {
    const cookies = recipe({ yieldType: "count", yieldWeightG: null, yieldCount: 24 });
    const cost = createCostBook(ingredients, []).recipeCost(cookies);
    expect(cost.perPieceMinor).toBeCloseTo(cost.totalMinor / 24, 6);
    expect(cost.perGramMinor).toBeNull();
  });

  it("gives both when a count recipe also has its weight", () => {
    const cookies = recipe({ yieldType: "count", yieldWeightG: 1_200, yieldCount: 24 });
    const cost = createCostBook(ingredients, []).recipeCost(cookies);
    expect(cost.perGramMinor).toBeCloseTo(cost.totalMinor / 1_200, 6);
    expect(cost.perPieceMinor).toBeCloseTo(cost.totalMinor / 24, 6);
  });
});

describe("sub-recipe lines", () => {
  // Salted Caramel, 500 g, cost only: ₦1,000 of sugar for its whole batch.
  const caramel = recipe({
    id: "caramel",
    yieldWeightG: 500,
    lines: [{ ingredientId: "Sugar", subRecipeId: null, amount: 625 }],
    overheadMinor: [50_000],
  });
  const cake = recipe({
    id: "cake",
    lines: [{ ingredientId: null, subRecipeId: "caramel", amount: 200 }],
    overheadMinor: [],
  });

  it("costs amount × the sub-recipe's ingredient cost per gram, without its overhead", () => {
    const book = createCostBook(ingredients, [caramel, cake]);
    expect(book.subRecipeUnitCost("caramel")).toBe(200);
    expect(book.recipeCost(cake).ingredientsMinor).toBe(40_000);
  });

  it("uses pieces for a count-yield sub-recipe", () => {
    const shells = recipe({ id: "shells", yieldType: "count", yieldWeightG: null, yieldCount: 10, overheadMinor: [] });
    const book = createCostBook(ingredients, [shells]);
    const total = book.recipeCost(shells).ingredientsMinor;
    expect(book.lineCost({ ingredientId: null, subRecipeId: "shells", amount: 2 })).toBeCloseTo((total / 10) * 2, 6);
  });

  it("is missing when the sub-recipe is deleted, unknown, lacks its yield, or has a missing line", () => {
    const deleted = createCostBook(ingredients, [{ ...caramel, deletedAt: "2026-10-01" }, cake]);
    expect(deleted.recipeCost(cake).missing).toBe(1);
    expect(createCostBook(ingredients, [cake]).recipeCost(cake).missing).toBe(1);
    const noYield = createCostBook(ingredients, [{ ...caramel, yieldWeightG: null }, cake]);
    expect(noYield.recipeCost(cake).missing).toBe(1);
    const unpriced = ingredients.map((item) => ({ ...item, packPriceMinor: null }));
    expect(createCostBook(unpriced, [caramel, cake]).recipeCost(cake).missing).toBe(1);
  });

  it("counts a recipe that includes itself as missing instead of looping", () => {
    const loop = recipe({ id: "loop", lines: [{ ingredientId: null, subRecipeId: "loop", amount: 1 }] });
    expect(createCostBook(ingredients, [loop]).recipeCost(loop).missing).toBe(1);
  });

  it("works out each saved sub-recipe once, but never remembers a recipe being built", () => {
    const book = createCostBook(ingredients, [caramel]);
    expect(book.subRecipeUnitCost("caramel")).toBe(200);
    expect(book.subRecipeUnitCost("caramel")).toBe(200);
    const building = recipe({ id: "caramel", lines: [] });
    expect(book.recipeCost(building).ingredientsMinor).toBe(0);
    expect(book.subRecipeUnitCost("caramel")).toBe(200);
  });
});

describe("subRecipeUnit", () => {
  it("is g for a weight yield and pcs for a count, or null without that yield", () => {
    expect(subRecipeUnit({ yieldType: "weight", yieldWeightG: 500, yieldCount: null })).toBe("g");
    expect(subRecipeUnit({ yieldType: "count", yieldWeightG: null, yieldCount: 24 })).toBe("pcs");
    expect(subRecipeUnit({ yieldType: "weight", yieldWeightG: null, yieldCount: 24 })).toBeNull();
    expect(subRecipeUnit({ yieldType: "count", yieldWeightG: 500, yieldCount: 0 })).toBeNull();
    expect(subRecipeUnit({ yieldType: "count", yieldWeightG: 500, yieldCount: null })).toBeNull();
    expect(subRecipeUnit({ yieldType: null, yieldWeightG: 500, yieldCount: 24 })).toBeNull();
  });
});

describe("createsLoop", () => {
  const uses: Record<string, string[]> = { cake: ["caramel"], caramel: ["syrup"], syrup: [], torte: ["cake", "caramel"] };
  const subRecipesOf = (id: string) => uses[id] ?? [];

  it("catches a recipe including itself, directly or through others", () => {
    expect(createsLoop("cake", "cake", subRecipesOf)).toBe(true);
    expect(createsLoop("syrup", "cake", subRecipesOf)).toBe(true);
    expect(createsLoop("caramel", "torte", subRecipesOf)).toBe(true);
  });

  it("allows a recipe that doesn't lead back, even when it's reached twice", () => {
    expect(createsLoop("new", "torte", subRecipesOf)).toBe(false);
    expect(createsLoop("cake", "syrup", subRecipesOf)).toBe(false);
  });
});
