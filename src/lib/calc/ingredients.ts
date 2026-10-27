// Ingredient cost per unit (PRD F3, §4). Pure; minor units at full precision.

import { convert, isUnit } from "../units";

export interface IngredientPrice {
  /** Empty = missing; 0 is a real price. */
  packPriceMinor: number | null;
  packSize: number | null;
  /** Codes as stored; anything unknown counts as missing. */
  packSizeUnit: string | null;
  /** The unit she measures it in. */
  unit: string;
  deletedAt?: string | null;
}

/**
 * Pack price ÷ pack size converted into the measuring unit, in minor units per
 * unit: ₦15,000 for 12.5 kg, measured in g → 120 (₦1.20 per g). null = missing:
 * no price or size, a size that isn't above 0, a size unit of another kind, or
 * a deleted ingredient. ₦0 is a real price and gives 0.
 */
export function costPerUnit({ packPriceMinor, packSize, packSizeUnit, unit, deletedAt }: IngredientPrice) {
  if (deletedAt || packPriceMinor === null || packSize === null || packSize <= 0) return null;
  if (!isUnit(packSizeUnit) || !isUnit(unit)) return null;
  const sizeInUnit = convert(packSize, packSizeUnit, unit);
  return sizeInUnit === null ? null : packPriceMinor / sizeInUnit;
}
