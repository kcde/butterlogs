"use client";

import { Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { CheckRow } from "@/components/CheckRow";
import { SearchField } from "@/components/SearchField";
import { costPerUnit } from "@/lib/calc/ingredients";
import { subRecipeUnit } from "@/lib/calc/recipes";
import type { CurrencyCode } from "@/lib/currency";
import type { IngredientRow } from "@/lib/db/ingredients";
import type { RecipeRow } from "@/lib/db/recipes";
import { formatUnitCost } from "@/lib/format";
import { matchesName, sortByName } from "@/lib/search";
import { isUnit } from "@/lib/units";
import styles from "./newRecipe.module.css";

export type LinesMode = "ingredients" | "recipes";

export interface AddLinesSheetProps {
  open: boolean;
  mode: LinesMode;
  currency: CurrencyCode;
  ingredients: readonly IngredientRow[];
  recipes: readonly RecipeRow[];
  /** A sub-recipe's ingredient cost per g or pc; null when it's incomplete. */
  subRecipeCost: (id: string) => number | null;
  /** Ids already in this section: shown ticked and greyed out (agreed 27 Oct). */
  inSection: ReadonlySet<string>;
  ticked: readonly string[];
  onTickedChange: (ticked: string[]) => void;
  /** "Add 2 ingredients" */
  onAdd: () => void;
  /** Ingredients only: make one she doesn't have yet, without leaving the recipe (agreed 27 Oct). */
  onNewIngredient: () => void;
  onClose: () => void;
}

function Missing({ children }: { children: string }) {
  return (
    <span className={styles.missing}>
      <TriangleAlert aria-hidden="true" />
      {children}
    </span>
  );
}

// AddIngredients.dc.html: tick several, then fill in the amounts. The same
// sheet adds saved recipes as sub-recipe lines (PRD F5).
export function AddLinesSheet({
  open,
  mode,
  currency,
  ingredients,
  recipes,
  subRecipeCost,
  inSection,
  ticked,
  onTickedChange,
  onAdd,
  onNewIngredient,
  onClose,
}: AddLinesSheetProps) {
  const [query, setQuery] = useState("");
  const forIngredients = mode === "ingredients";

  const rows = forIngredients
    ? ingredients.map((ingredient) => {
        const cost = costPerUnit({
          packPriceMinor: ingredient.pack_price_minor,
          packSize: ingredient.pack_size,
          packSizeUnit: ingredient.pack_size_unit,
          unit: ingredient.unit ?? "",
        });
        return {
          id: ingredient.id,
          name: ingredient.name ?? "",
          trailing:
            cost === null || !isUnit(ingredient.unit) ? (
              <Missing>add price</Missing>
            ) : (
              formatUnitCost(cost, currency, ingredient.unit)
            ),
        };
      })
    : sortByName(recipes).map((recipe) => {
        const unit = subRecipeUnit({
          yieldType: recipe.yield_type,
          yieldWeightG: recipe.yield_weight_g,
          yieldCount: recipe.yield_count,
        });
        const cost = subRecipeCost(recipe.id);
        return {
          id: recipe.id,
          name: recipe.name ?? "",
          trailing: cost === null || unit === null ? <Missing>incomplete</Missing> : formatUnitCost(cost, currency, unit),
        };
      });

  const visible = rows.filter((row) => matchesName(row.name, query));
  const count = ticked.length;
  const noun = forIngredients ? "ingredient" : "recipe";
  const addLabel = count === 0 ? `Add ${noun}s` : `Add ${count} ${noun}${count === 1 ? "" : "s"}`;

  return (
    <BottomSheet
      open={open}
      title={forIngredients ? "Add ingredients" : "Add recipes"}
      onClose={onClose}
      footer={
        <Button variant="primary" block disabled={count === 0} onClick={onAdd}>
          {addLabel}
        </Button>
      }
    >
      <SearchField value={query} onChange={setQuery} placeholder={forIngredients ? "Search ingredients" : "Search recipes"} />
      <div className={styles.checks}>
        {visible.map((row) => {
          const added = inSection.has(row.id);
          return (
            <CheckRow
              key={row.id}
              label={row.name}
              checked={added || ticked.includes(row.id)}
              disabled={added}
              trailing={row.trailing}
              onChange={(on) => onTickedChange(on ? [...ticked, row.id] : ticked.filter((id) => id !== row.id))}
            />
          );
        })}
      </div>
      {visible.length === 0 && (
        <p className={styles.none}>
          {query.trim()
            ? `No ${noun}s match “${query.trim()}”.`
            : forIngredients
              ? "No ingredients yet."
              : "No saved recipes yet."}
        </p>
      )}
      {forIngredients && (
        <div className={styles.newIngredient}>
          <Button variant="ghost" icon={<Plus />} onClick={onNewIngredient}>
            New ingredient
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}
