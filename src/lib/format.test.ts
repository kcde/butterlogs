import { describe, expect, it } from "vitest";
import {
  formatInputNumber,
  formatMoney,
  formatPackSize,
  formatUnitCost,
  formatUpdated,
  parseTimestamp,
} from "./format";

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

describe("formatUnitCost", () => {
  it("shows 2 decimals with a spaced slash and the unit (PRD §4)", () => {
    expect(formatUnitCost(120, "NGN", "g")).toBe("₦1.20 / g");
    expect(formatUnitCost(160, "NGN", "g")).toBe("₦1.60 / g");
    expect(formatUnitCost(1_340, "NGN", "ml")).toBe("₦13.40 / ml");
  });

  it("drops .00 from a whole amount (agreed 25 Oct, as in the mockups)", () => {
    expect(formatUnitCost(4_000, "NGN", "g")).toBe("₦40 / g");
    expect(formatUnitCost(120_000, "NGN", "kg")).toBe("₦1,200 / kg");
    expect(formatUnitCost(0, "NGN", "ml")).toBe("₦0 / ml");
  });

  it("rounds for display only, and a value that rounds to a whole amount shows none", () => {
    expect(formatUnitCost(33_333.333, "NGN", "pcs")).toBe("₦333.33 / pc");
    expect(formatUnitCost(3_999.6, "NGN", "g")).toBe("₦40 / g");
    expect(formatUnitCost(-0.2, "NGN", "g")).toBe("₦0 / g");
  });

  it("says pc for pieces and uses the sheet's per wording when asked", () => {
    expect(formatUnitCost(2_000, "NGN", "pcs")).toBe("₦20 / pc");
    expect(formatUnitCost(120, "NGN", "g", "per")).toBe("₦1.20 per g");
    expect(formatUnitCost(2_000, "NGN", "pcs", "per")).toBe("₦20 per pc");
  });

  it("uses the business currency and the unit's label", () => {
    expect(formatUnitCost(120, "USD", "l")).toBe("$1.20 / L");
    expect(formatUnitCost(50, "GBP", "fl_oz")).toBe("£0.50 / fl oz");
  });
});

describe("formatPackSize", () => {
  it("shows the size as typed, up to 2 decimals, with thousands commas", () => {
    expect(formatPackSize(12.5, "kg")).toBe("12.5 kg");
    expect(formatPackSize(1000, "g")).toBe("1,000 g");
    expect(formatPackSize(0.125, "kg")).toBe("0.13 kg");
    expect(formatPackSize(200, "g")).toBe("200 g");
  });

  it("says L for litres and pc for a single piece", () => {
    expect(formatPackSize(1, "l")).toBe("1 L");
    expect(formatPackSize(1, "pcs")).toBe("1 pc");
    expect(formatPackSize(50, "pcs")).toBe("50 pcs");
    expect(formatPackSize(1.001, "pcs")).toBe("1 pc");
  });
});

describe("formatInputNumber", () => {
  it("puts a stored number back into a field with commas and no trailing zeros", () => {
    expect(formatInputNumber(15000)).toBe("15,000");
    expect(formatInputNumber(12.5)).toBe("12.5");
    expect(formatInputNumber(15000.5)).toBe("15,000.5");
    expect(formatInputNumber(0.125)).toBe("0.125");
  });
});

describe("parseTimestamp", () => {
  it("reads ISO text and PowerSync's space-separated timestamptz text", () => {
    const expected = Date.UTC(2026, 9, 25, 17, 30, 32, 123);
    expect(parseTimestamp("2026-10-25T17:30:32.123Z")?.getTime()).toBe(expected);
    expect(parseTimestamp("2026-10-25 17:30:32.123Z")?.getTime()).toBe(expected);
    expect(parseTimestamp("2026-10-25 17:30:32.123+00")?.getTime()).toBe(expected);
    expect(parseTimestamp("2026-10-25 18:30:32.123+01:00")?.getTime()).toBe(expected);
  });

  it("returns null for text that isn't a time", () => {
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("yesterday")).toBeNull();
  });
});

describe("formatUpdated", () => {
  // Local times, so calendar days are the phone's.
  const now = new Date(2026, 9, 25, 9, 0);
  const daysAgo = (days: number, hour = 12) => new Date(2026, 9, 25 - days, hour).toISOString();

  it.each([
    [0, "today"],
    [1, "yesterday"],
    [3, "3 days ago"],
    [6, "6 days ago"],
    [7, "1 week ago"],
    [14, "2 weeks ago"],
    [29, "4 weeks ago"],
    [30, "1 month ago"],
    [95, "3 months ago"],
    [364, "12 months ago"],
    [365, "1 year ago"],
    [800, "2 years ago"],
  ])("%s days ago → %s", (days, expected) => {
    expect(formatUpdated(daysAgo(days), now)).toBe(expected);
  });

  it("counts calendar days, not 24-hour blocks", () => {
    expect(formatUpdated(daysAgo(1, 23), now)).toBe("yesterday");
    expect(formatUpdated(new Date(2026, 9, 25, 0, 5).toISOString(), now)).toBe("today");
  });

  it("says today for a time a little ahead of this phone's clock", () => {
    expect(formatUpdated(new Date(2026, 9, 26, 10).toISOString(), now)).toBe("today");
  });

  it("returns null when the stored text isn't a time", () => {
    expect(formatUpdated("not a time", now)).toBeNull();
  });
});
