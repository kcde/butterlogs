import { describe, expect, it } from "vitest";
import { parseNumber, toMinor } from "./parse";

describe("parseNumber", () => {
  it("accepts numbers with or without thousands commas", () => {
    expect(parseNumber("1700")).toBe(1700);
    expect(parseNumber("1,700")).toBe(1700);
    expect(parseNumber(" 15,000 ")).toBe(15000);
    expect(parseNumber("12.5")).toBe(12.5);
    expect(parseNumber(".5")).toBe(0.5);
    expect(parseNumber("12.")).toBe(12);
    expect(parseNumber("0")).toBe(0);
  });

  it("returns null for empty or non-numbers", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("   ")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("1.2.3")).toBeNull();
    expect(parseNumber("-5")).toBeNull();
    expect(parseNumber("50%")).toBeNull();
  });
});

describe("toMinor", () => {
  it("stores whole units × 100, rounded to a whole minor unit", () => {
    expect(toMinor(15000)).toBe(1_500_000);
    expect(toMinor(2000)).toBe(200_000);
    expect(toMinor(0.015)).toBe(2);
    expect(toMinor(0)).toBe(0);
  });
});
