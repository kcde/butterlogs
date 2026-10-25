import { describe, expect, it } from "vitest";
import { type IngredientForm, ingredientValues, nameTaken, priceChanged } from "./ingredients";

const list = [
  { id: "1", name: "Flour" },
  { id: "2", name: "Crème fraîche" },
  { id: "3", name: null },
];

describe("nameTaken", () => {
  it("finds an existing name ignoring capitals and surrounding spaces", () => {
    expect(nameTaken("flour", list)).toEqual({ id: "1", name: "Flour" });
    expect(nameTaken("  FLOUR ", list)?.id).toBe("1");
    expect(nameTaken("CRÈME FRAÎCHE", list)?.id).toBe("2");
  });

  it("lets an ingredient keep its own name", () => {
    expect(nameTaken("Flour", list, "1")).toBeNull();
    expect(nameTaken("flour", list, "2")?.id).toBe("1");
  });

  it("treats accents as different letters (only capitals are ignored)", () => {
    expect(nameTaken("Creme fraiche", list)).toBeNull();
  });

  it("returns null for a new name", () => {
    expect(nameTaken("Sugar", list)).toBeNull();
  });
});

const form = (overrides: Partial<IngredientForm> = {}): IngredientForm => ({
  name: " Flour ",
  unit: "g",
  packPrice: "15,000",
  packSize: "12.5",
  packSizeUnit: "kg",
  notes: " Bulk bag ",
  ...overrides,
});

describe("ingredientValues", () => {
  it("stores money in minor units and trims text", () => {
    expect(ingredientValues(form())).toEqual({
      name: "Flour",
      unit: "g",
      pack_price_minor: 1_500_000,
      pack_size: 12.5,
      pack_size_unit: "kg",
      notes: "Bulk bag",
    });
  });

  it("keeps an empty price or size as missing, but ₦0 as a real price", () => {
    const missing = ingredientValues(form({ packPrice: "", packSize: " " }));
    expect(missing.pack_price_minor).toBeNull();
    expect(missing.pack_size).toBeNull();
    expect(ingredientValues(form({ packPrice: "0" })).pack_price_minor).toBe(0);
  });

  it("stores empty notes as null", () => {
    expect(ingredientValues(form({ notes: "  " })).notes).toBeNull();
  });
});

describe("priceChanged", () => {
  const before = { pack_price_minor: 1_500_000, pack_size: 12.5, pack_size_unit: "kg" };

  it("is true when the price, size or size unit changes", () => {
    expect(priceChanged(before, { ...before, pack_price_minor: 1_600_000 })).toBe(true);
    expect(priceChanged(before, { ...before, pack_price_minor: null })).toBe(true);
    expect(priceChanged(before, { ...before, pack_size: 25 })).toBe(true);
    expect(priceChanged(before, { ...before, pack_size_unit: "g" })).toBe(true);
  });

  it("is false when they're all the same", () => {
    expect(priceChanged(before, { ...before })).toBe(false);
  });
});
