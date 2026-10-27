// PRD §9: Vanilla Cake at ×1 (1,500 g), from the Vanilla Cake and Ingredients
// tabs of her costing journal. Used by the cost maths tests and the e2e flow.

export const VANILLA_CAKE_INGREDIENTS = [
  { name: "Sugar", unit: "g", priceMinor: 2_000_000, size: 12_500, amount: 380 },
  { name: "Flour", unit: "g", priceMinor: 1_500_000, size: 12_500, amount: 350 },
  { name: "Baking powder", unit: "g", priceMinor: 600_000, size: 450, amount: 12 },
  { name: "Salt", unit: "g", priceMinor: 60_000, size: 500, amount: 5 },
  { name: "Oil", unit: "ml", priceMinor: 400_000, size: 700, amount: 118 },
  { name: "Vanilla extract", unit: "ml", priceMinor: 500_000, size: 500, amount: 10 },
  { name: "Yogurt", unit: "g", priceMinor: 150_000, size: 200, amount: 118 },
  { name: "Milk", unit: "ml", priceMinor: 400_000, size: 1_000, amount: 296 },
  { name: "Eggs", unit: "pcs", priceMinor: 30_000, size: 1, amount: 3 },
] as const;

/** The starter items (create_business makes the first four) and the five she adds. */
export const VANILLA_CAKE_OVERHEAD = [
  { name: "Gas", amountMinor: 50_000 },
  { name: "Electricity", amountMinor: 50_000 },
  { name: "Transport", amountMinor: 100_000 },
  { name: "Labour", amountMinor: 300_000 },
  { name: "Pan maintenance", amountMinor: 10_000 },
  { name: "Oven maintenance", amountMinor: 10_000 },
  { name: "Goop", amountMinor: 5_000 },
  { name: "Baking paper", amountMinor: 5_000 },
  { name: "Cling film", amountMinor: 5_000 },
] as const;

export const VANILLA_CAKE_YIELD_G = 1_500;
