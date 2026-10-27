"use client";

import { useQuery } from "@powersync/react";
import type { AbstractPowerSyncDatabase } from "@powersync/web";
import { useMemo } from "react";
import { type CostIngredient, type CostRecipe, createCostBook } from "@/lib/calc/recipes";
import type { RecipeRows } from "@/lib/recipes";
import type { IngredientRow } from "./ingredients";
import type { Recipe, RecipeLine, RecipeOverheadLine } from "./schema";

export type RecipeRow = Recipe & { id: string };
type LineRow = RecipeLine & { id: string };
type OverheadLineRow = RecipeOverheadLine & { id: string };

// Deleted recipes and ingredients are read too: lines that still point at them
// count as missing (PRD F3, F5).
const RECIPES = "SELECT * FROM recipes WHERE business_id = ?";
const LINES = "SELECT * FROM recipe_lines WHERE business_id = ? ORDER BY position";
const OVERHEAD = "SELECT * FROM recipe_overhead_lines WHERE business_id = ? ORDER BY position";
const INGREDIENTS = "SELECT * FROM ingredients WHERE business_id = ?";

// Not Map.groupBy: that needs Safari 17.4, and her iPhone may be older.
function byRecipe<T extends { recipe_id: string | null }>(rows: readonly T[]) {
  const groups = new Map<string | null, T[]>();
  for (const row of rows) {
    const group = groups.get(row.recipe_id);
    if (group) group.push(row);
    else groups.set(row.recipe_id, [row]);
  }
  return groups;
}

/** The phone's rows as the cost maths reads them (lib/calc/recipes.ts). */
export function toCostSnapshot(
  recipes: readonly RecipeRow[],
  lines: readonly LineRow[],
  overhead: readonly OverheadLineRow[],
  ingredients: readonly IngredientRow[],
) {
  const linesOf = byRecipe(lines);
  const overheadOf = byRecipe(overhead);
  const costRecipes: CostRecipe[] = recipes.map((recipe) => ({
    id: recipe.id,
    deletedAt: recipe.deleted_at,
    yieldType: recipe.yield_type,
    yieldWeightG: recipe.yield_weight_g,
    yieldCount: recipe.yield_count,
    lines: (linesOf.get(recipe.id) ?? []).map((line) => ({
      ingredientId: line.ingredient_id,
      subRecipeId: line.sub_recipe_id,
      amount: line.amount ?? 0,
    })),
    overheadMinor: (overheadOf.get(recipe.id) ?? []).map((line) => line.amount_minor ?? 0),
  }));
  const costIngredients: CostIngredient[] = ingredients.map((ingredient) => ({
    id: ingredient.id,
    unit: ingredient.unit,
    packPriceMinor: ingredient.pack_price_minor,
    packSize: ingredient.pack_size,
    packSizeUnit: ingredient.pack_size_unit,
    deletedAt: ingredient.deleted_at,
  }));
  return { costRecipes, costIngredients };
}

/**
 * Her recipes with everything needed to cost them, kept up to date: the list
 * cards, the sub-recipe sheet and the flow's running totals all read this.
 * `recipes` leaves out deleted ones; `costs` covers every saved recipe.
 */
export function useRecipeCosts(businessId: string) {
  const recipes = useQuery<RecipeRow>(RECIPES, [businessId]);
  const lines = useQuery<LineRow>(LINES, [businessId]);
  const overhead = useQuery<OverheadLineRow>(OVERHEAD, [businessId]);
  const ingredients = useQuery<IngredientRow>(INGREDIENTS, [businessId]);

  return useMemo(() => {
    const { costRecipes, costIngredients } = toCostSnapshot(recipes.data, lines.data, overhead.data, ingredients.data);
    const book = createCostBook(costIngredients, costRecipes);
    const byId = new Map(costRecipes.map((recipe) => [recipe.id, recipe]));
    return {
      isLoading: recipes.isLoading || lines.isLoading || overhead.isLoading || ingredients.isLoading,
      recipes: recipes.data.filter((recipe) => !recipe.deleted_at),
      book,
      /** A saved recipe's cost at its base yield. */
      costOf: (id: string) => {
        const recipe = byId.get(id);
        return recipe ? book.recipeCost(recipe) : null;
      },
    };
  }, [recipes.data, recipes.isLoading, lines.data, lines.isLoading, overhead.data, overhead.isLoading, ingredients.data, ingredients.isLoading]);
}

/**
 * Saves a finished draft as a recipe (PRD F5) in one transaction: the recipe,
 * then its sections, lines and overhead lines (the order the server's foreign
 * keys need when they upload), and the draft goes.
 */
export async function saveNewRecipe(
  db: AbstractPowerSyncDatabase,
  { rows, draftId, now = new Date() }: { rows: RecipeRows; draftId: string; now?: Date },
) {
  const timestamp = now.toISOString();
  const stamp = { created_at: timestamp, updated_at: timestamp };
  await db.writeTransaction(async (tx) => {
    const insert = (table: string, row: Record<string, unknown>) => {
      const columns = Object.keys(row);
      return tx.execute(
        `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
        Object.values(row),
      );
    };
    await insert("recipes", { ...rows.recipe, ...stamp });
    for (const section of rows.sections) await insert("recipe_sections", { ...section, ...stamp });
    for (const line of rows.lines) await insert("recipe_lines", { ...line, ...stamp });
    for (const line of rows.overhead) await insert("recipe_overhead_lines", { ...line, ...stamp });
    await tx.execute("DELETE FROM recipe_drafts WHERE id = ?", [draftId]);
  });
}
