// Recipe costs (PRD F5, §4). Pure; minor units at full precision. Works over a
// plain snapshot of her recipes and ingredients, so a recipe being built (not
// saved yet) is costed the same way as a saved one.

import { costPerUnit } from "./ingredients";

export interface CostIngredient {
  id: string;
  /** The unit she measures it in. */
  unit: string | null;
  packPriceMinor: number | null;
  packSize: number | null;
  packSizeUnit: string | null;
  deletedAt: string | null;
}

/** An ingredient line or a sub-recipe line: exactly one id is set. */
export interface CostLine {
  ingredientId: string | null;
  subRecipeId: string | null;
  /** In the ingredient's unit, or the sub-recipe's yield unit (g or pcs). */
  amount: number;
}

export interface CostRecipe {
  id: string;
  deletedAt: string | null;
  yieldType: string | null;
  yieldWeightG: number | null;
  yieldCount: number | null;
  lines: readonly CostLine[];
  /** Overhead line amounts; deleted overhead items still count (PRD F2). */
  overheadMinor: readonly number[];
}

export interface RecipeCost {
  /** Every line that has a cost; missing lines add nothing. */
  ingredientsMinor: number;
  /** Lines with no cost: no price, deleted, or a sub-recipe that is itself missing. */
  missing: number;
  overheadMinor: number;
  totalMinor: number;
  /** null without a weight yield. */
  perGramMinor: number | null;
  /** null without a count yield. */
  perPieceMinor: number | null;
}

/** The unit a sub-recipe line is measured in: g for a weight yield, pcs for a count; null without that yield. */
export function subRecipeUnit(recipe: Pick<CostRecipe, "yieldType" | "yieldWeightG" | "yieldCount">) {
  if (recipe.yieldType === "weight") return (recipe.yieldWeightG ?? 0) > 0 ? "g" : null;
  if (recipe.yieldType === "count") return (recipe.yieldCount ?? 0) > 0 ? "pcs" : null;
  return null;
}

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

/**
 * Costs for one snapshot. Sub-recipe totals are worked out once each, and a
 * recipe that (wrongly) includes itself counts as missing instead of looping.
 */
export function createCostBook(ingredients: readonly CostIngredient[], recipes: readonly CostRecipe[]) {
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const ingredientTotals = new Map<string, { totalMinor: number; missing: number }>();
  const inProgress = new Set<string>();

  function ingredientTotal(recipe: CostRecipe) {
    // Only saved recipes are remembered: a draft can change between calls,
    // even when it has the id of the recipe it will become.
    const saved = recipeById.get(recipe.id) === recipe;
    const known = saved ? ingredientTotals.get(recipe.id) : undefined;
    if (known) return known;
    inProgress.add(recipe.id);
    let totalMinor = 0;
    let missing = 0;
    for (const line of recipe.lines) {
      const cost = lineCost(line);
      if (cost === null) missing += 1;
      else totalMinor += cost;
    }
    inProgress.delete(recipe.id);
    const result = { totalMinor, missing };
    if (saved) ingredientTotals.set(recipe.id, result);
    return result;
  }

  /**
   * A sub-recipe's ingredient cost per gram or piece of its yield (ingredients
   * only: its overhead and price aren't carried in). null when it's deleted,
   * has a missing line, lacks the yield, or would include itself.
   */
  function subRecipeUnitCost(id: string) {
    const recipe = recipeById.get(id);
    if (!recipe || recipe.deletedAt || inProgress.has(id)) return null;
    const unit = subRecipeUnit(recipe);
    if (unit === null) return null;
    const { totalMinor, missing } = ingredientTotal(recipe);
    if (missing > 0) return null;
    return totalMinor / (unit === "g" ? (recipe.yieldWeightG as number) : (recipe.yieldCount as number));
  }

  /** amount × cost per unit, or null when it can't be costed. */
  function lineCost(line: CostLine) {
    if (line.subRecipeId !== null) {
      const unitCost = subRecipeUnitCost(line.subRecipeId);
      return unitCost === null ? null : line.amount * unitCost;
    }
    const ingredient = line.ingredientId === null ? undefined : ingredientById.get(line.ingredientId);
    if (!ingredient) return null;
    const unitCost = costPerUnit({
      packPriceMinor: ingredient.packPriceMinor,
      packSize: ingredient.packSize,
      packSizeUnit: ingredient.packSizeUnit,
      unit: ingredient.unit ?? "",
      deletedAt: ingredient.deletedAt,
    });
    return unitCost === null ? null : line.amount * unitCost;
  }

  /** The whole recipe at its base yield: ingredients, overhead, total, and per gram or piece. */
  function recipeCost(recipe: CostRecipe): RecipeCost {
    const { totalMinor: ingredientsMinor, missing } = ingredientTotal(recipe);
    const overheadMinor = sum(recipe.overheadMinor);
    const totalMinor = ingredientsMinor + overheadMinor;
    const grams = recipe.yieldWeightG ?? 0;
    const pieces = recipe.yieldCount ?? 0;
    return {
      ingredientsMinor,
      missing,
      overheadMinor,
      totalMinor,
      perGramMinor: grams > 0 ? totalMinor / grams : null,
      perPieceMinor: pieces > 0 ? totalMinor / pieces : null,
    };
  }

  return { lineCost, subRecipeUnitCost, recipeCost };
}

/**
 * True when adding `subRecipeId` as a line of `recipeId` would make a recipe
 * include itself, directly or through other recipes (PRD F5: no loops).
 * `subRecipesOf` gives the sub-recipe ids each recipe uses.
 */
export function createsLoop(recipeId: string, subRecipeId: string, subRecipesOf: (id: string) => readonly string[]) {
  const seen = new Set<string>();
  const waiting = [subRecipeId];
  while (waiting.length > 0) {
    const id = waiting.pop() as string;
    if (id === recipeId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    waiting.push(...subRecipesOf(id));
  }
  return false;
}
