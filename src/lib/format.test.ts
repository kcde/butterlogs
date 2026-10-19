import { describe, expect, it } from "vitest";
import { formatMoney } from "./format";

describe("formatMoney", () => {
  it("shows whole units with the currency symbol first and thousands commas", () => {
    expect(formatMoney(1_500_000, "NGN")).toBe("₦15,000");
    expect(formatMoney(15_000, "USD")).toBe("$150");
    expect(formatMoney(1_000_000, "GBP")).toBe("£10,000");
    expect(formatMoney(1_000_000, "EUR")).toBe("€10,000");
  });

  it("rounds to the nearest whole unit for display only", () => {
    expect(formatMoney(1_543_093, "NGN")).toBe("₦15,431");
    expect(formatMoney(1_492_537.31, "NGN")).toBe("₦14,925");
    expect(formatMoney(49, "NGN")).toBe("₦0");
  });

  it("shows ₦0 for a real zero, and never a minus sign on zero", () => {
    expect(formatMoney(0, "NGN")).toBe("₦0");
    expect(formatMoney(-0, "NGN")).toBe("₦0");
    expect(formatMoney(-40, "NGN")).toBe("₦0");
  });

  it("shows a loss with a minus sign", () => {
    expect(formatMoney(-50_000, "NGN")).toBe("-₦500");
  });
});
