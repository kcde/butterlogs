// Pricing methods (PRD F7). Pure; amounts are minor units at full precision.
// Prices are always worked out from the cost, never stored.

export type PricingMethod = "markup" | "margin" | "fixed_profit" | "set_price";

export interface Pricing {
  /** null = cost only (e.g. fillings used inside other recipes). */
  method: PricingMethod | null;
  /** Markup and margin, e.g. 50 for 50%. */
  percent: number | null;
  /** Fixed profit and set price. */
  amountMinor: number | null;
}

export interface PriceResult {
  price: number;
  /** price − cost */
  profit: number;
  /** profit ÷ price; null when the price is 0. */
  margin: number | null;
  /** profit ÷ cost; null when the cost is 0. */
  markup: number | null;
}

/** Margin must be under 100% (PRD F7). */
export function isValidMargin(percent: number) {
  return percent >= 0 && percent < 100;
}

function sellingPrice(costMinor: number, { method, percent, amountMinor }: Pricing): number | null {
  switch (method) {
    case "markup":
      return percent === null || percent < 0 ? null : costMinor * (1 + percent / 100);
    case "margin":
      return percent === null || !isValidMargin(percent) ? null : costMinor / (1 - percent / 100);
    case "fixed_profit":
      return amountMinor === null ? null : costMinor + amountMinor;
    case "set_price":
      return amountMinor;
    default:
      return null;
  }
}

/** The selling price for a cost, and the profit, margin and markup it gives. null = no price (cost only, or no valid value yet). */
export function priceFor(costMinor: number, pricing: Pricing): PriceResult | null {
  const price = sellingPrice(costMinor, pricing);
  if (price === null) return null;
  const profit = price - costMinor;
  return {
    price,
    profit,
    margin: price === 0 ? null : profit / price,
    markup: costMinor === 0 ? null : profit / costMinor,
  };
}
