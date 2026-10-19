// Reading numbers she types. Fields accept "1,700" and "1700" (TextField README).

/** The number in a field, or null when it's empty or not a number. Negative numbers aren't accepted. */
export function parseNumber(text: string): number | null {
  const cleaned = text.replace(/[,\s]/g, "");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Money typed in whole currency units → stored minor units (always × 100, PRD §6). */
export function toMinor(units: number) {
  return Math.round(units * 100);
}
