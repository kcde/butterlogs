"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePowerSync } from "@powersync/react";
import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { AmountField } from "@/components/AmountField";
import { BottomSheet } from "@/components/BottomSheet";
import { Button } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { SelectField } from "@/components/SelectField";
import { TextField } from "@/components/TextField";
import { costPerUnit } from "@/lib/calc/ingredients";
import { type CurrencyCode, currencySymbol } from "@/lib/currency";
import { type IngredientRow, saveIngredient } from "@/lib/db/ingredients";
import { formatInputNumber, formatUnitCost, formatUpdated } from "@/lib/format";
import { type IngredientForm, ingredientValues, nameTaken } from "@/lib/ingredients";
import { parseNumber, toMinor } from "@/lib/parse";
import { isUnit, type Unit, UNITS, unitKind, unitLabel, unitsOfKind } from "@/lib/units";
import styles from "./ingredients.module.css";

const unitOptions = (units: Unit[]) => units.map((unit) => ({ value: unit, label: unitLabel(unit) }));

const isEmpty = (text: string) => text.trim() === "";

function formSchema(others: readonly IngredientRow[], selfId: string | undefined) {
  return z
    .object({
      name: z.string().superRefine((name, ctx) => {
        if (isEmpty(name)) {
          ctx.addIssue({ code: "custom", message: "Add a name." });
          return;
        }
        const taken = nameTaken(name, others, selfId);
        if (taken) ctx.addIssue({ code: "custom", message: `You already have ${taken.name}.` });
      }),
      unit: z.enum(UNITS),
      // Empty = missing (PRD F3); ₦0 is a real price.
      packPrice: z.string().refine((text) => isEmpty(text) || parseNumber(text) !== null, "Type the price, like 15,000."),
      packSize: z.string().refine((text) => isEmpty(text) || (parseNumber(text) ?? 0) > 0, "Type a size above 0, like 12.5."),
      packSizeUnit: z.enum(UNITS),
      notes: z.string(),
    })
    .refine((form) => unitKind(form.unit) === unitKind(form.packSizeUnit), {
      path: ["packSizeUnit"],
      message: "Pick a unit of the same kind as the one you measure in.",
    });
}

function initialForm(ingredient: IngredientRow | null): IngredientForm {
  const unit = isUnit(ingredient?.unit) ? ingredient.unit : "g";
  const packSizeUnit = isUnit(ingredient?.pack_size_unit) ? ingredient.pack_size_unit : unit;
  return {
    name: ingredient?.name ?? "",
    unit,
    packPrice: ingredient?.pack_price_minor == null ? "" : formatInputNumber(ingredient.pack_price_minor / 100),
    packSize: ingredient?.pack_size == null ? "" : formatInputNumber(ingredient.pack_size),
    packSizeUnit: unitKind(packSizeUnit) === unitKind(unit) ? packSizeUnit : unit,
    notes: ingredient?.notes ?? "",
  };
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
  onDelete: () => void;
}

// IngredientSheet.dc.html: add or edit one ingredient.
export function IngredientSheet({
  open,
  ingredient,
  ingredients,
  usedIn,
  businessId,
  currency,
  onClose,
  onDelete,
}: IngredientSheetProps) {
  const db = usePowerSync();
  const [problem, setProblem] = useState<string | null>(null);
  // The sheet is made fresh for each ingredient, so the list it checks names
  // against is the one at opening; saving checks the current list again.
  const [schema] = useState(() => formSchema(ingredients, ingredient?.id));
  const { control, handleSubmit, setValue, setError, formState } = useForm<IngredientForm>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: initialForm(ingredient),
  });
  const [unit, packPrice, packSize, packSizeUnit] = useWatch({
    control,
    name: ["unit", "packPrice", "packSize", "packSizeUnit"],
  });

  // Editing keeps the same kind (PRD F3: recipe amounts are converted, never
  // across kinds). A new ingredient can be anything.
  const measureUnits = ingredient && isUnit(ingredient.unit) ? unitsOfKind(unitKind(ingredient.unit)) : UNITS;
  const price = parseNumber(packPrice);
  const cost = costPerUnit({
    packPriceMinor: price === null ? null : toMinor(price),
    packSize: parseNumber(packSize),
    packSizeUnit,
    unit,
  });

  const updated = ingredient?.price_updated_at ? formatUpdated(ingredient.price_updated_at, new Date()) : null;
  const caption = [
    updated && `Price updated ${updated}`,
    usedIn > 0 && `Used in ${usedIn} recipe${usedIn === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const save = handleSubmit(async (form) => {
    const taken = nameTaken(form.name, ingredients, ingredient?.id);
    if (taken) {
      setError("name", { message: `You already have ${taken.name}.` }, { shouldFocus: true });
      return;
    }
    setProblem(null);
    try {
      await saveIngredient(db, { businessId, existing: ingredient, values: ingredientValues(form) });
      onClose();
    } catch (error) {
      Sentry.captureException(error, { tags: { ingredient: "save" } });
      setProblem("That didn’t save. Try again.");
    }
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
            name="packPrice"
            render={({ field, fieldState }) => (
              <TextField
                label="Pack price"
                type="number"
                prefix={currencySymbol(currency)}
                placeholder="0"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <div className={styles.pair}>
            <Controller
              control={control}
              name="packSize"
              render={({ field, fieldState }) => (
                <AmountField
                  label="Pack size"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  unit={packSizeUnit}
                  units={unitsOfKind(unitKind(unit))}
                  onUnitChange={(next) => setValue("packSizeUnit", next, { shouldValidate: true })}
                  error={fieldState.error?.message ?? formState.errors.packSizeUnit?.message}
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
                  onChange={(value) => {
                    const next = value as Unit;
                    field.onChange(next);
                    // A pack in another kind can't be costed: start it in the new unit.
                    if (unitKind(next) !== unitKind(packSizeUnit)) setValue("packSizeUnit", next);
                  }}
                />
              )}
            />
          </div>
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
        {/* Lets Go on the keyboard submit; the visible Save is in the footer. */}
        <button type="submit" hidden />
      </form>
    </BottomSheet>
  );
}
