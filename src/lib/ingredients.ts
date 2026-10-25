// The ingredient and restock forms' rules (PRD F3): checked in the app, never
// by the server (PRD §6 rule 3).

import { parseNumber, toMinor } from "./parse";
import type { Unit } from "./units";

/** What the ingredient sheet holds: text as typed, the unit as a code. */
export interface IngredientForm {
  name: string;
  unit: Unit;
  notes: string;
}

/** The ingredient's own values, as stored. Its price comes from restocking. */
export interface IngredientValues {
  name: string;
  unit: Unit;
  notes: string | null;
}

/** What the restock sheet holds: "Amount bought" and "Price paid", as typed. */
export interface RestockForm {
  amount: string;
  amountUnit: Unit;
  price: string;
}

/** A restock as stored: the row's price columns hold the last one. */
export interface RestockValues {
  pack_price_minor: number;
  pack_size: number;
  pack_size_unit: Unit;
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

/** The form as row values: text trimmed, empty notes as null. Assumes the form passed validation. */
export function ingredientValues(form: IngredientForm): IngredientValues {
  const notes = form.notes.trim();
  return { name: form.name.trim(), unit: form.unit, notes: notes === "" ? null : notes };
}

/**
 * The restock as row values, the price in minor units (₦0 stays 0), or null
 * while the amount isn't above 0 or the price isn't a number.
 */
export function restockValues(form: RestockForm): RestockValues | null {
  const price = parseNumber(form.price);
  const amount = parseNumber(form.amount);
  if (price === null || amount === null || amount <= 0) return null;
  return { pack_price_minor: toMinor(price), pack_size: amount, pack_size_unit: form.amountUnit };
}
