"use client";

import { useQuery } from "@powersync/react";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import { useMemo } from "react";
import type { IngredientValues, RestockValues } from "@/lib/ingredients";
import { sortByName } from "@/lib/search";
import { baseSize, isUnit, unitKind } from "@/lib/units";
import type { Ingredient } from "./schema";

export type IngredientRow = Ingredient & { id: string };

const LIST = "SELECT * FROM ingredients WHERE business_id = ? AND deleted_at IS NULL";

/** Her ingredients on this phone, A to Z (deleted ones left out). */
export function useIngredients(businessId: string) {
  const { data, isLoading } = useQuery<IngredientRow>(LIST, [businessId]);
  const ingredients = useMemo(() => sortByName(data), [data]);
  return { ingredients, isLoading };
}

const RECIPES_USING = `
  SELECT DISTINCT recipes.id, recipes.name FROM recipe_lines
  JOIN recipes ON recipes.id = recipe_lines.recipe_id
  WHERE recipe_lines.ingredient_id = ? AND recipes.deleted_at IS NULL`;

type RecipeName = { id: string; name: string | null };

/** The (non-deleted) recipes with a line for this ingredient, A to Z. */
export async function recipesUsing(db: AbstractPowerSyncDatabase, ingredientId: string) {
  return sortByName(await db.getAll<RecipeName>(RECIPES_USING, [ingredientId]));
}

/** recipesUsing, kept up to date. No ingredient = none. */
export function useRecipesUsing(ingredientId: string | null) {
  const { data } = useQuery<RecipeName>(RECIPES_USING, [ingredientId ?? ""]);
  return useMemo(() => sortByName(data), [data]);
}

/**
 * Adds an ingredient, or saves changes to one, in one transaction (PRD F3).
 * Only its own details: the price comes from restockIngredient.
 * - A new one has no price yet ("add price").
 * - Changing the measuring unit (same kind) converts every recipe line for it,
 *   so no cost changes.
 * Returns the ingredient's id.
 */
export async function saveIngredient(
  db: AbstractPowerSyncDatabase,
  { businessId, existing, values, now = new Date() }: {
    businessId: string;
    existing: IngredientRow | null;
    values: IngredientValues;
    now?: Date;
  },
) {
  const timestamp = now.toISOString();
  const { name, unit, notes } = values;

  return db.writeTransaction(async (tx) => {
    if (!existing) {
      const id = crypto.randomUUID();
      await tx.execute(
        `INSERT INTO ingredients (id, business_id, name, unit, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, businessId, name, unit, notes, timestamp, timestamp],
      );
      return id;
    }

    await tx.execute("UPDATE ingredients SET name = ?, unit = ?, notes = ?, updated_at = ? WHERE id = ?", [
      name,
      unit,
      notes,
      timestamp,
      existing.id,
    ]);

    // Same order of operations as convert(): 350 g → 350 × 1 ÷ 1000 = 0.35 kg exactly.
    const from = existing.unit;
    if (isUnit(from) && from !== unit && unitKind(from) === unitKind(unit)) {
      await tx.execute("UPDATE recipe_lines SET amount = amount * ? / ?, updated_at = ? WHERE ingredient_id = ?", [
        baseSize(from),
        baseSize(unit),
        timestamp,
        existing.id,
      ]);
    }
    return existing.id;
  });
}

/**
 * Records what she just bought (PRD F3, Restock): the amount, its unit and the
 * price replace the last restock, and "Price updated" moves to now even when
 * the numbers are the same.
 */
export async function restockIngredient(
  db: AbstractPowerSyncDatabase,
  { id, values, now = new Date() }: { id: string; values: RestockValues; now?: Date },
) {
  const timestamp = now.toISOString();
  await db.execute(
    `UPDATE ingredients SET pack_price_minor = ?, pack_size = ?, pack_size_unit = ?, price_updated_at = ?, updated_at = ?
     WHERE id = ?`,
    [values.pack_price_minor, values.pack_size, values.pack_size_unit, timestamp, timestamp, id],
  );
}

/** Soft delete (PRD §6): recipes still find it, and show it as deleted. */
export async function deleteIngredient(db: AbstractPowerSyncDatabase, id: string, now = new Date()) {
  const timestamp = now.toISOString();
  await db.execute("UPDATE ingredients SET deleted_at = ?, updated_at = ? WHERE id = ?", [timestamp, timestamp, id]);
}
