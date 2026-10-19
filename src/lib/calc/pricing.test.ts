import { describe, expect, it } from "vitest";
import { formatMoney } from "../format";
import { isValidMargin, priceFor, type Pricing } from "./pricing";

const COST = 1_000_000; // ₦10,000
const pricing = (overrides: Partial<Pricing>): Pricing => ({
  method: null,
  percent: null,
  amountMinor: null,
  ...overrides,
});

// PRD §9: pricing methods at cost ₦10,000.
describe("PRD §9 fixture: the four methods at ₦10,000", () => {
  it.each([
    ["markup 50%", pricing({ method: "markup", percent: 50 }), "₦15,000"],
    ["margin 33%", pricing({ method: "margin", percent: 33 }), "₦14,925"],
    ["fixed ₦2,000", pricing({ method: "fixed_profit", amountMinor: 200_000 }), "₦12,000"],
    ["set ₦15,000", pricing({ method: "set_price", amountMinor: 1_500_000 }), "₦15,000"],
  ])("%s → %s", (_name, method, price) => {
    expect(formatMoney(priceFor(COST, method)!.price, "NGN")).toBe(price);
  });
});

describe("priceFor", () => {
  it("always derives profit, margin and markup", () => {
    expect(priceFor(COST, pricing({ method: "markup", percent: 50 }))).toEqual({
      price: 1_500_000,
      profit: 500_000,
      margin: 1 / 3,
      markup: 0.5,
    });
    const margin = priceFor(COST, pricing({ method: "margin", percent: 33 }))!;
    expect(margin.margin).toBeCloseTo(0.33, 10);
    expect(margin.price).toBeCloseTo(1_492_537.3134, 3);
  });

  it("keeps full precision (no rounding)", () => {
    expect(priceFor(333.33, pricing({ method: "markup", percent: 10 }))!.price).toBeCloseTo(366.663, 10);
  });

  it("gives no price for cost only", () => {
    expect(priceFor(COST, pricing({}))).toBeNull();
  });

  it("gives no price until the method has its value", () => {
    expect(priceFor(COST, pricing({ method: "markup" }))).toBeNull();
    expect(priceFor(COST, pricing({ method: "margin" }))).toBeNull();
    expect(priceFor(COST, pricing({ method: "fixed_profit" }))).toBeNull();
    expect(priceFor(COST, pricing({ method: "set_price" }))).toBeNull();
  });

  it("refuses a margin of 100% or more, and negative percentages", () => {
    expect(priceFor(COST, pricing({ method: "margin", percent: 100 }))).toBeNull();
    expect(priceFor(COST, pricing({ method: "margin", percent: 120 }))).toBeNull();
    expect(priceFor(COST, pricing({ method: "markup", percent: -5 }))).toBeNull();
  });

  it("handles a zero cost and a zero price", () => {
    expect(priceFor(0, pricing({ method: "markup", percent: 50 }))).toEqual({
      price: 0,
      profit: 0,
      margin: null,
      markup: null,
    });
    expect(priceFor(0, pricing({ method: "set_price", amountMinor: 500_000 }))!.markup).toBeNull();
    expect(priceFor(COST, pricing({ method: "set_price", amountMinor: 0 }))!.margin).toBeNull();
  });

  it("shows a loss when a set price is under the cost", () => {
    expect(priceFor(COST, pricing({ method: "set_price", amountMinor: 800_000 }))).toEqual({
      price: 800_000,
      profit: -200_000,
      margin: -0.25,
      markup: -0.2,
    });
  });
});

describe("isValidMargin", () => {
  it("allows 0 up to just under 100", () => {
    expect(isValidMargin(0)).toBe(true);
    expect(isValidMargin(99.9)).toBe(true);
    expect(isValidMargin(100)).toBe(false);
    expect(isValidMargin(-1)).toBe(false);
  });
});
