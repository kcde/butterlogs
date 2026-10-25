import { describe, expect, it } from "vitest";
import { convert, isUnit, UNITS, unitKind, unitLabel, unitsOfKind } from "./units";

describe("units", () => {
  it("has the eleven units of PRD F3, as the design system's codes", () => {
    expect(UNITS).toEqual(["g", "kg", "oz", "lb", "ml", "l", "fl_oz", "tsp", "tbsp", "cup", "pcs"]);
  });

  it("knows its own codes and nothing else", () => {
    expect(isUnit("g")).toBe(true);
    expect(isUnit("fl_oz")).toBe(true);
    expect(isUnit("fl oz")).toBe(false);
    expect(isUnit("toString")).toBe(false);
    expect(isUnit("")).toBe(false);
    expect(isUnit(null)).toBe(false);
    expect(isUnit(undefined)).toBe(false);
  });

  it("groups them into weight, volume and count", () => {
    expect(unitsOfKind("weight")).toEqual(["g", "kg", "oz", "lb"]);
    expect(unitsOfKind("volume")).toEqual(["ml", "l", "fl_oz", "tsp", "tbsp", "cup"]);
    expect(unitsOfKind("count")).toEqual(["pcs"]);
    expect(unitKind("cup")).toBe("volume");
  });
});

describe("convert (PRD §4)", () => {
  it.each([
    [12.5, "kg", "g", 12_500],
    [1, "oz", "g", 28.3495],
    [1, "lb", "g", 453.592],
    [1, "l", "ml", 1000],
    [1, "fl_oz", "ml", 29.5735],
    [1, "tsp", "ml", 4.929],
    [1, "tbsp", "ml", 14.787],
    [1, "cup", "ml", 236.588],
    [50, "pcs", "pcs", 50],
  ] as const)("%s %s in %s = %s", (amount, from, to, expected) => {
    expect(convert(amount, from, to)).toBeCloseTo(expected, 10);
  });

  it("works in either direction, at full precision", () => {
    expect(convert(500, "g", "kg")).toBe(0.5);
    expect(convert(1, "cup", "tbsp")).toBeCloseTo(236.588 / 14.787, 12);
  });

  it("refuses to convert between kinds (no cups ↔ grams)", () => {
    expect(convert(1, "cup", "g")).toBeNull();
    expect(convert(1, "g", "pcs")).toBeNull();
    expect(convert(1, "pcs", "ml")).toBeNull();
  });
});

describe("unitLabel", () => {
  it("shows litres as L and fluid ounces with a space", () => {
    expect(unitLabel("l")).toBe("L");
    expect(unitLabel("fl_oz")).toBe("fl oz");
    expect(unitLabel("g")).toBe("g");
  });

  it("says pc for exactly one piece, pcs otherwise", () => {
    expect(unitLabel("pcs", 1)).toBe("pc");
    expect(unitLabel("pcs", 50)).toBe("pcs");
    expect(unitLabel("pcs", 1.5)).toBe("pcs");
    expect(unitLabel("pcs")).toBe("pcs");
  });
});
