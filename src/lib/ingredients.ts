// The ingredient form's rules (PRD F3): checked in the app, never by the
// server (PRD §6 rule 3).

import { parseNumber, toMinor } from "./parse";
import type { Unit } from "./units";

/** What the ingredient sheet holds: text as typed, units as codes. */
export interface IngredientForm {
  name: string;
  unit: Unit;
  packPrice: string;
  packSize: string;
  packSizeUnit: Unit;
  notes: string;
}

/** A row's editable values, as stored. Empty price or size = missing. */
export interface IngredientValues {
  name: string;
  unit: Unit;
  pack_price_minor: number | null;
  pack_size: number | null;
  pack_size_unit: Unit;
  notes: string | null;
}

const key = (name: string) => name.trim().toLocaleLowerCase("en");

/**
 * The existing ingredient with this name, ignoring capitals and spaces at
 * either end, among the (non-deleted) ones given, leaving out the one being
 * edited. Done here, not in SQL: SQLite's lower() only folds ASCII.
 */
export function nameTaken<T extends { id: string; name: string | null }>(name: string, others: readonly T[], selfId?: string) {
  const wanted = key(name);
  return others.find((other) => other.id !== selfId && key(other.name ?? "") === wanted) ?? null;
}

/** The form as row values: the name trimmed, the price in minor units, empty fields as null. Assumes the form passed validation. */
export function ingredientValues(form: IngredientForm): IngredientValues {
  const price = parseNumber(form.packPrice);
  const notes = form.notes.trim();
  return {
    name: form.name.trim(),
    unit: form.unit,
    pack_price_minor: price === null ? null : toMinor(price),
    pack_size: parseNumber(form.packSize),
    pack_size_unit: form.packSizeUnit,
    notes: notes === "" ? null : notes,
  };
}

type PriceFields = Pick<IngredientValues, "pack_price_minor" | "pack_size"> & { pack_size_unit: string | null };

/** True when the price, size or size unit differs: what moves "Price updated" (PRD F3). */
export function priceChanged(before: PriceFields, after: PriceFields) {
  return (
    before.pack_price_minor !== after.pack_price_minor ||
    before.pack_size !== after.pack_size ||
    before.pack_size_unit !== after.pack_size_unit
  );
}
