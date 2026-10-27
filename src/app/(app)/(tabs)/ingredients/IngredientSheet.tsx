"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePowerSync } from "@powersync/react";
import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { SelectField } from "@/components/SelectField";
import { TextField } from "@/components/TextField";
import { costPerUnit } from "@/lib/calc/ingredients";
import type { CurrencyCode } from "@/lib/currency";
import { type IngredientRow, saveIngredient } from "@/lib/db/ingredients";
import { formatMoney, formatPackSize, formatUnitCost, formatUpdated } from "@/lib/format";
import { type IngredientForm, ingredientValues } from "@/lib/ingredients";
import { nameTaken } from "@/lib/names";
import { isUnit, type Unit, UNITS, unitKind, unitLabel, unitsOfKind } from "@/lib/units";
import styles from "./ingredients.module.css";
import type { RestockTarget } from "./RestockSheet";

const unitOptions = (units: Unit[]) => units.map((unit) => ({ value: unit, label: unitLabel(unit) }));

function formSchema(others: readonly IngredientRow[], selfId: string | undefined) {
  return z.object({
    name: z.string().superRefine((name, ctx) => {
      if (name.trim() === "") {
        ctx.addIssue({ code: "custom", message: "Add a name." });
        return;
      }
      const taken = nameTaken(name, others, selfId);
      if (taken) ctx.addIssue({ code: "custom", message: `You already have ${taken.name}.` });
    }),
    unit: z.enum(UNITS),
    notes: z.string(),
  });
}

function initialForm(ingredient: IngredientRow | null): IngredientForm {
  return {
    name: ingredient?.name ?? "",
    unit: isUnit(ingredient?.unit) ? ingredient.unit : "g",
    notes: ingredient?.notes ?? "",
  };
}

/** "Last bought 12.5 kg for ₦15,000, 2 weeks ago", or null before the first restock. */
function lastBought(ingredient: IngredientRow | null, currency: CurrencyCode, now: Date) {
  if (!ingredient) return null;
  const { pack_size, pack_size_unit, pack_price_minor, price_updated_at } = ingredient;
  if (pack_size === null || !isUnit(pack_size_unit) || pack_price_minor === null) return null;
  const bought = `Last bought ${formatPackSize(pack_size, pack_size_unit)} for ${formatMoney(pack_price_minor, currency)}`;
  return price_updated_at ? `${bought}, ${formatUpdated(price_updated_at, now)}` : bought;
}

export interface IngredientSheetProps {
  open: boolean;
  /** null = a new ingredient. */
  ingredient: IngredientRow | null;
  /** The other non-deleted ingredients, for the unique-name check. */
  ingredients: readonly IngredientRow[];
  /** How many recipes use it, for "Used in 14 recipes". */
  usedIn: number;
  businessId: string;
  currency: CurrencyCode;
  onClose: () => void;
  /** After a new ingredient is saved, or Restock is tapped (edits saved first). */
  onRestock: (target: RestockTarget) => void;
  onDelete: () => void;
}

// IngredientSheet.dc.html: add or edit one ingredient. Its price comes from
// Restock (PRD F3), so the pack fields of the mockup aren't here.
export function IngredientSheet({
  open,
  ingredient,
  ingredients,
  usedIn,
  businessId,
  currency,
  onClose,
  onRestock,
  onDelete,
}: IngredientSheetProps) {
  const db = usePowerSync();
  const [problem, setProblem] = useState<string | null>(null);
  // The sheet is made fresh for each ingredient, so the list it checks names
  // against is the one at opening; saving checks the current list again.
  const [schema] = useState(() => formSchema(ingredients, ingredient?.id));
  const { control, handleSubmit, setError, formState } = useForm<IngredientForm>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: initialForm(ingredient),
  });
  const unit = useWatch({ control, name: "unit" });

  // Editing keeps the same kind (PRD F3: recipe amounts are converted, never
  // across kinds). A new ingredient can be anything.
  const measureUnits = ingredient && isUnit(ingredient.unit) ? unitsOfKind(unitKind(ingredient.unit)) : UNITS;
  // The last restock, in the unit chosen now: "₦1,200 per kg" as soon as kg is picked.
  const cost = ingredient
    ? costPerUnit({
        packPriceMinor: ingredient.pack_price_minor,
        packSize: ingredient.pack_size,
        packSizeUnit: ingredient.pack_size_unit,
        unit,
      })
    : null;

  const caption = [
    lastBought(ingredient, currency, new Date()),
    usedIn > 0 && `Used in ${usedIn} recipe${usedIn === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  /** Saves the form and returns the ingredient's id, or null if it didn't save. */
  async function persist(form: IngredientForm) {
    const taken = nameTaken(form.name, ingredients, ingredient?.id);
    if (taken) {
      setError("name", { message: `You already have ${taken.name}.` }, { shouldFocus: true });
      return null;
    }
    setProblem(null);
    try {
      return await saveIngredient(db, { businessId, existing: ingredient, values: ingredientValues(form) });
    } catch (error) {
      Sentry.captureException(error, { tags: { ingredient: "save" } });
      setProblem("That didn’t save. Try again.");
      return null;
    }
  }

  function restockTarget(id: string, form: IngredientForm): RestockTarget {
    return {
      id,
      name: form.name.trim(),
      unit: form.unit,
      lastAmount: ingredient?.pack_size ?? null,
      lastAmountUnit: ingredient?.pack_size_unit ?? null,
    };
  }

  // A new ingredient goes straight on to Restock; an edited one is done.
  const save = handleSubmit(async (form) => {
    const id = await persist(form);
    if (id === null) return;
    if (ingredient) onClose();
    else onRestock(restockTarget(id, form));
  });

  // Unsaved edits are saved first, so Restock sees the current name and unit.
  const restock = handleSubmit(async (form) => {
    if (!ingredient) return;
    const id = formState.isDirty ? await persist(form) : ingredient.id;
    if (id !== null) onRestock(restockTarget(id, form));
  });

  return (
    <BottomSheet
      open={open}
      title={ingredient ? "Edit ingredient" : "New ingredient"}
      onClose={onClose}
      footer={
        <>
          {problem && (
            <p className={styles.problem} role="alert">
              {problem}
            </p>
          )}
          <Button variant="primary" block disabled={formState.isSubmitting} onClick={() => void save()}>
            Save
          </Button>
          {ingredient && (
            <button type="button" className={styles.delete} onClick={onDelete}>
              Delete ingredient
            </button>
          )}
        </>
      }
    >
      {/* A form, so the keyboard's Go key saves too. */}
      <form noValidate onSubmit={save}>
        <div className={styles.fields}>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                label="Name"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="unit"
            render={({ field }) => (
              <SelectField
                label="I measure it in"
                value={field.value}
                options={unitOptions(measureUnits)}
                onChange={(value) => field.onChange(value as Unit)}
              />
            )}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field }) => (
              <TextField label="Notes" value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
            )}
          />
          {cost !== null && (
            <Notice variant="result" title="Works out to">
              {formatUnitCost(cost, currency, unit, "per")}
            </Notice>
          )}
        </div>
        {caption && <p className={styles.caption}>{caption}</p>}
        {ingredient && (
          <div className={styles.restock}>
            <Button block disabled={formState.isSubmitting} onClick={() => void restock()}>
              Restock
            </Button>
          </div>
        )}
        {/* Lets Go on the keyboard submit; the visible Save is in the footer. */}
        <button type="submit" hidden />
      </form>
    </BottomSheet>
  );
}
