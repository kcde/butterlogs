import { describe, expect, it } from "vitest";
import { type IngredientForm, ingredientValues, type RestockForm, restockValues } from "./ingredients";

const form = (overrides: Partial<IngredientForm> = {}): IngredientForm => ({
  name: " Flour ",
  unit: "g",
  notes: " Bulk bag ",
  ...overrides,
});

describe("ingredientValues", () => {
  it("trims text", () => {
    expect(ingredientValues(form())).toEqual({ name: "Flour", unit: "g", notes: "Bulk bag" });
  });

  it("stores empty notes as null", () => {
    expect(ingredientValues(form({ notes: "  " })).notes).toBeNull();
  });
});

const restock = (overrides: Partial<RestockForm> = {}): RestockForm => ({
  amount: "12.5",
  amountUnit: "kg",
  price: "15,000",
  ...overrides,
});

describe("restockValues", () => {
  it("stores the price in minor units with the amount and its unit", () => {
    expect(restockValues(restock())).toEqual({ pack_price_minor: 1_500_000, pack_size: 12.5, pack_size_unit: "kg" });
  });

  it("keeps ₦0 as a real price", () => {
    expect(restockValues(restock({ price: "0" }))?.pack_price_minor).toBe(0);
  });

  it("is null until the amount is above 0 and the price is a number", () => {
    expect(restockValues(restock({ price: "" }))).toBeNull();
    expect(restockValues(restock({ amount: "" }))).toBeNull();
    expect(restockValues(restock({ amount: "0" }))).toBeNull();
  });
});
