import { describe, expect, it } from "vitest";
import { convert } from "../units";
import { costPerUnit, type IngredientPrice } from "./ingredients";

const flour: IngredientPrice = { packPriceMinor: 1_500_000, packSize: 12.5, packSizeUnit: "kg", unit: "g" };

// PRD §9: units and missing prices.
describe("PRD §9 fixtures", () => {
  it("₦15,000 per 12.5 kg, measured in g → ₦1.20 per g", () => {
    expect(costPerUnit(flour)).toBe(120);
  });

  it("₦1,000 per 50 pcs → ₦20 per pc", () => {
    expect(costPerUnit({ packPriceMinor: 100_000, packSize: 50, packSizeUnit: "pcs", unit: "pcs" })).toBe(2_000);
  });

  it("₦0 is a real price; an empty price is missing", () => {
    expect(costPerUnit({ ...flour, packPriceMinor: 0 })).toBe(0);
    expect(costPerUnit({ ...flour, packPriceMinor: null })).toBeNull();
  });
});

describe("costPerUnit", () => {
  it("converts a pack in a bigger unit of the same kind (PRD F3 acceptance)", () => {
    expect(costPerUnit({ ...flour, unit: "kg" })).toBe(120_000);
    expect(costPerUnit({ packPriceMinor: 1_300_000, packSize: 1, packSizeUnit: "l", unit: "ml" })).toBe(1_300);
    expect(costPerUnit({ packPriceMinor: 800_000, packSize: 200, packSizeUnit: "g", unit: "g" })).toBe(4_000);
  });

  it("keeps full precision", () => {
    expect(costPerUnit({ packPriceMinor: 100_000, packSize: 3, packSizeUnit: "pcs", unit: "pcs" })).toBeCloseTo(
      33_333.3333333,
      6,
    );
  });

  it("is missing without a usable pack size", () => {
    expect(costPerUnit({ ...flour, packSize: null })).toBeNull();
    expect(costPerUnit({ ...flour, packSize: 0 })).toBeNull();
    expect(costPerUnit({ ...flour, packSizeUnit: null })).toBeNull();
    expect(costPerUnit({ ...flour, packSizeUnit: "bag" })).toBeNull();
    expect(costPerUnit({ ...flour, unit: "bag" })).toBeNull();
  });

  it("is missing when the pack is a different kind (no cups ↔ grams)", () => {
    expect(costPerUnit({ ...flour, packSizeUnit: "l" })).toBeNull();
  });

  it("is missing for a deleted ingredient", () => {
    expect(costPerUnit({ ...flour, deletedAt: "2026-10-25T10:00:00Z" })).toBeNull();
  });

  it("changing the measuring unit (with recipe amounts converted) keeps every cost the same", () => {
    const amountInGrams = 187;
    const before = amountInGrams * costPerUnit(flour)!;
    const after = convert(amountInGrams, "g", "kg")! * costPerUnit({ ...flour, unit: "kg" })!;
    expect(after).toBeCloseTo(before, 9);

    const ozBefore = 5 * costPerUnit({ ...flour, unit: "oz" })!;
    const ozAfter = convert(5, "oz", "lb")! * costPerUnit({ ...flour, unit: "lb" })!;
    expect(ozAfter).toBeCloseTo(ozBefore, 9);
  });
});
