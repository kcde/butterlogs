import { describe, expect, it } from "vitest";
import {
  basicsErrors,
  blankDraft,
  draftCostRecipe,
  draftPricing,
  draftTitle,
  hasContent,
  ingredientsEmptyBoxes,
  overheadEmptyBoxes,
  pricingError,
  type RecipeDraft,
  recipeRows,
} from "./recipes";

let counter = 0;
const newKey = () => `k${++counter}`;

const markup = { method: "markup", percent: 50 };

function draft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return { ...blankDraft(markup, () => "s1"), ...overrides };
}

const line = (key: string, amount: string, ingredientId: string | null = "flour", subRecipeId: string | null = null) => ({
  key,
  ingredientId,
  subRecipeId,
  amount,
});

describe("blankDraft", () => {
  it("starts with one unnamed section, no overhead and the business's default pricing", () => {
    expect(blankDraft(markup, newKey)).toMatchObject({
      name: "",
      categoryId: null,
      yieldType: "weight",
      yieldWeightUnit: "g",
      sections: [{ name: "", lines: [] }],
      overhead: [],
      pricingMethod: "markup",
      pricingPercent: "50",
      pricingAmount: "",
    });
  });

  it("leaves the amount empty for a fixed profit or set price default, and falls back to markup", () => {
    expect(blankDraft({ method: "set_price", percent: null }, newKey)).toMatchObject({
      pricingMethod: "set_price",
      pricingPercent: "",
      pricingAmount: "",
    });
    expect(blankDraft({ method: null, percent: null }, newKey)).toMatchObject({ pricingMethod: "markup", pricingPercent: "" });
  });

  it("makes its own keys when none are given", () => {
    expect(blankDraft(markup).sections[0].key).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("hasContent", () => {
  it("is false for a blank recipe, even with pricing changed", () => {
    expect(hasContent(draft())).toBe(false);
    expect(hasContent(draft({ pricingMethod: "cost_only", notes: "  " }))).toBe(false);
  });

  it.each<[string, Partial<RecipeDraft>]>([
    ["a name", { name: "Vanilla Cake" }],
    ["notes", { notes: "L&Z yogurt" }],
    ["a category", { categoryId: "cakes" }],
    ["a weight", { yieldWeight: "1500" }],
    ["a count", { yieldCount: "24" }],
    ["a second section", { sections: [{ key: "s1", name: "", lines: [] }, { key: "s2", name: "", lines: [] }] }],
    ["a line", { sections: [{ key: "s1", name: "", lines: [line("l1", "")] }] }],
    ["overhead", { overhead: [{ key: "o1", overheadItemId: "gas", amount: "" }] }],
  ])("is true once there's %s", (_what, overrides) => {
    expect(hasContent(draft(overrides))).toBe(true);
  });
});

describe("draftTitle", () => {
  it("is the name, or Untitled recipe", () => {
    expect(draftTitle(" Lemon Cake ")).toBe("Lemon Cake");
    expect(draftTitle("  ")).toBe("Untitled recipe");
    expect(draftTitle(null)).toBe("Untitled recipe");
  });
});

describe("basicsErrors", () => {
  const saved = [{ id: "r1", name: "Vanilla Cake" }];

  it("needs a name she hasn't used, ignoring capitals", () => {
    expect(basicsErrors(draft({ yieldWeight: "1500" }), saved).name).toBe("Add a name.");
    expect(basicsErrors(draft({ name: "vanilla cake", yieldWeight: "1500" }), saved).name).toBe(
      "You already have Vanilla Cake.",
    );
    expect(basicsErrors(draft({ name: "Lemon Cake", yieldWeight: "1,500" }), saved)).toEqual({});
  });

  it("needs a yield above 0 for the chosen type", () => {
    expect(basicsErrors(draft({ name: "A", yieldWeight: "0" }), []).yield).toBe("Type the weight, like 1,500.");
    expect(basicsErrors(draft({ name: "A", yieldType: "count", yieldWeight: "1500" }), []).yield).toBe(
      "Type how many, like 24.",
    );
  });

  it("lets the second figure stay empty, but not hold something that isn't a number above 0", () => {
    const weight = draft({ name: "A", yieldWeight: "1200", secondYield: true });
    expect(basicsErrors(weight, [])).toEqual({});
    expect(basicsErrors({ ...weight, yieldCount: "abc" }, []).secondYield).toBe("Type how many, like 24, or leave it empty.");
    const count = draft({ name: "A", yieldType: "count", yieldCount: "24", secondYield: true, yieldWeight: "0" });
    expect(basicsErrors(count, []).secondYield).toBe("Type the weight, like 1,200, or leave it empty.");
    // Hidden, it isn't checked.
    expect(basicsErrors({ ...weight, secondYield: false, yieldCount: "abc" }, [])).toEqual({});
  });
});

describe("ingredientsEmptyBoxes", () => {
  it("lists lines without an amount above 0 and added sections without a name, in order", () => {
    const sections = [
      { key: "s1", name: "", lines: [line("l1", "380"), line("l2", ""), line("l3", "0")] },
      { key: "s2", name: " ", lines: [line("l4", "1.5")] },
      { key: "s3", name: "Crumble", lines: [line("l5", "abc")] },
    ];
    expect(ingredientsEmptyBoxes(draft({ sections }))).toEqual(["l2", "l3", "s2", "l5"]);
  });

  it("never asks for the first section's name", () => {
    expect(ingredientsEmptyBoxes(draft())).toEqual([]);
  });
});

describe("overheadEmptyBoxes", () => {
  it("lists overhead rows with no amount; ₦0 is fine", () => {
    const overhead = [
      { key: "o1", overheadItemId: "gas", amount: "500" },
      { key: "o2", overheadItemId: "goop", amount: "0" },
      { key: "o3", overheadItemId: "labour", amount: "" },
    ];
    expect(overheadEmptyBoxes(draft({ overhead }))).toEqual(["o3"]);
  });
});

describe("pricingError", () => {
  it.each<[Partial<RecipeDraft>, string | null]>([
    [{ pricingMethod: "markup", pricingPercent: "50" }, null],
    [{ pricingMethod: "markup", pricingPercent: "" }, "Type a percentage."],
    [{ pricingMethod: "margin", pricingPercent: "33" }, null],
    [{ pricingMethod: "margin", pricingPercent: "100" }, "Margin must be under 100%."],
    [{ pricingMethod: "fixed_profit", pricingAmount: "2,000" }, null],
    [{ pricingMethod: "fixed_profit", pricingAmount: "" }, "Type the profit, like 2,000."],
    [{ pricingMethod: "set_price", pricingAmount: "" }, "Type the price, like 15,000."],
    [{ pricingMethod: "set_price", pricingAmount: "0" }, null],
    [{ pricingMethod: "cost_only", pricingPercent: "" }, null],
  ])("%o → %s", (overrides, error) => {
    expect(pricingError(draft(overrides))).toBe(error);
  });
});

describe("draftPricing", () => {
  it("gives the maths a percent or an amount in minor units, and no method for Cost only", () => {
    expect(draftPricing(draft({ pricingMethod: "margin", pricingPercent: "33" }))).toEqual({
      method: "margin",
      percent: 33,
      amountMinor: null,
    });
    expect(draftPricing(draft({ pricingMethod: "fixed_profit", pricingAmount: "2,000", pricingPercent: "50" }))).toEqual({
      method: "fixed_profit",
      percent: null,
      amountMinor: 200_000,
    });
    expect(draftPricing(draft({ pricingMethod: "set_price", pricingAmount: "" }))).toMatchObject({ amountMinor: null });
    expect(draftPricing(draft({ pricingMethod: "cost_only" }))).toEqual({ method: null, percent: null, amountMinor: null });
  });
});

describe("draftCostRecipe", () => {
  it("counts amounts not typed yet as 0 and converts the weight to grams", () => {
    const cost = draftCostRecipe(
      draft({
        yieldWeight: "1.5",
        yieldWeightUnit: "kg",
        sections: [{ key: "s1", name: "", lines: [line("l1", "380"), line("l2", "", null, "caramel")] }],
        overhead: [
          { key: "o1", overheadItemId: "gas", amount: "500" },
          { key: "o2", overheadItemId: "goop", amount: "" },
        ],
      }),
      "new",
    );
    expect(cost).toEqual({
      id: "new",
      deletedAt: null,
      yieldType: "weight",
      yieldWeightG: 1500,
      yieldCount: null,
      lines: [
        { ingredientId: "flour", subRecipeId: null, amount: 380 },
        { ingredientId: null, subRecipeId: "caramel", amount: 0 },
      ],
      overheadMinor: [50_000, 0],
    });
  });

  it("leaves out a yield that isn't a number above 0 yet", () => {
    expect(draftCostRecipe(draft({ yieldWeight: "0" }), "w")).toMatchObject({ yieldWeightG: null });
    expect(draftCostRecipe(draft({ yieldType: "count", yieldCount: "0" }), "c")).toMatchObject({ yieldCount: null });
    expect(draftCostRecipe(draft({ yieldType: "count", yieldCount: "" }), "c")).toMatchObject({ yieldCount: null });
  });

  it("includes the second figure only while it's shown", () => {
    const count = draft({ yieldType: "count", yieldCount: "24", yieldWeight: "1200" });
    expect(draftCostRecipe(count, "c")).toMatchObject({ yieldCount: 24, yieldWeightG: null });
    expect(draftCostRecipe({ ...count, secondYield: true }, "c")).toMatchObject({ yieldCount: 24, yieldWeightG: 1200 });
  });
});

describe("recipeRows", () => {
  const finished = draft({
    name: " Salted Caramel Cake ",
    categoryId: "cakes",
    notes: " L&Z yogurt ",
    yieldWeight: "1,000",
    sections: [
      { key: "s1", name: "ignored", lines: [line("l1", "180"), line("l2", "2", "eggs")] },
      { key: "s2", name: " Salted Caramel ", lines: [line("l3", "100", null, "caramel")] },
    ],
    overhead: [
      { key: "o1", overheadItemId: "gas", amount: "500" },
      { key: "o2", overheadItemId: "goop", amount: "0" },
    ],
  });
  const rows = recipeRows(finished, { recipeId: "r1", businessId: "b1" });

  it("stores the recipe trimmed, in grams, with its pricing", () => {
    expect(rows.recipe).toEqual({
      id: "r1",
      business_id: "b1",
      name: "Salted Caramel Cake",
      category_id: "cakes",
      notes: "L&Z yogurt",
      yield_type: "weight",
      yield_weight_g: 1000,
      yield_count: null,
      pricing_method: "markup",
      pricing_percent: 50,
      pricing_amount_minor: null,
    });
  });

  it("stores the first section unnamed and the others trimmed, with positions from 1", () => {
    expect(rows.sections).toEqual([
      { id: "s1", business_id: "b1", recipe_id: "r1", name: null, position: 1 },
      { id: "s2", business_id: "b1", recipe_id: "r1", name: "Salted Caramel", position: 2 },
    ]);
  });

  it("keeps each line in its section, in order, using the draft's keys as ids", () => {
    expect(rows.lines).toEqual([
      { id: "l1", business_id: "b1", recipe_id: "r1", section_id: "s1", position: 1, ingredient_id: "flour", sub_recipe_id: null, amount: 180 },
      { id: "l2", business_id: "b1", recipe_id: "r1", section_id: "s1", position: 2, ingredient_id: "eggs", sub_recipe_id: null, amount: 2 },
      { id: "l3", business_id: "b1", recipe_id: "r1", section_id: "s2", position: 1, ingredient_id: null, sub_recipe_id: "caramel", amount: 100 },
    ]);
  });

  it("stores overhead in minor units, ₦0 included", () => {
    expect(rows.overhead.map((row) => [row.overhead_item_id, row.amount_minor, row.position])).toEqual([
      ["gas", 50_000, 1],
      ["goop", 0, 2],
    ]);
  });

  it("stores empty notes as null and Cost only with no pricing", () => {
    const filling = recipeRows(draft({ name: "Caramel", yieldWeight: "500", pricingMethod: "cost_only" }), {
      recipeId: "r2",
      businessId: "b1",
    });
    expect(filling.recipe).toMatchObject({ notes: null, pricing_method: null, pricing_percent: null, pricing_amount_minor: null });
  });
});
