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
import { TextField } from "@/components/TextField";
import { costPerUnit } from "@/lib/calc/ingredients";
import { type CurrencyCode, currencySymbol } from "@/lib/currency";
import { restockIngredient } from "@/lib/db/ingredients";
import { formatInputNumber, formatUnitCost } from "@/lib/format";
import { type RestockForm, restockValues } from "@/lib/ingredients";
import { parseNumber } from "@/lib/parse";
import { isUnit, type Unit, UNITS, unitKind, unitsOfKind } from "@/lib/units";
import styles from "./ingredients.module.css";

// Both are needed: the sheet exists to record a price (PRD F3). ₦0 is a real price.
const schema = z.object({
  amount: z.string().refine((text) => (parseNumber(text) ?? 0) > 0, "Type an amount above 0, like 12.5."),
  amountUnit: z.enum(UNITS),
  price: z.string().refine((text) => parseNumber(text) !== null, "Type the price, like 15,000."),
});

/** The ingredient being restocked, as just saved (the list may not have caught up). */
export interface RestockTarget {
  id: string;
  name: string;
  /** The unit she measures it in: the amount offers units of the same kind. */
  unit: Unit;
  /** The last restock's amount and unit, to start from; null the first time. */
  lastAmount: number | null;
  lastAmountUnit: string | null;
}

/** The last amount and unit (she usually buys the same bag), and always an empty price. */
function initialForm({ unit, lastAmount, lastAmountUnit }: RestockTarget): RestockForm {
  const sameKind = isUnit(lastAmountUnit) && unitKind(lastAmountUnit) === unitKind(unit);
  return {
    amount: sameKind && lastAmount !== null ? formatInputNumber(lastAmount) : "",
    amountUnit: sameKind ? lastAmountUnit : unit,
    price: "",
  };
}

export interface RestockSheetProps {
  open: boolean;
  target: RestockTarget;
  currency: CurrencyCode;
  onClose: () => void;
}

// Restock (PRD F3; no mockup, built from IngredientSheet.dc.html's parts): what
// she just bought and what she paid.
export function RestockSheet({ open, target, currency, onClose }: RestockSheetProps) {
  const db = usePowerSync();
  const [problem, setProblem] = useState<string | null>(null);
  const { control, handleSubmit, setValue, formState } = useForm<RestockForm>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: initialForm(target),
  });
  const [amount, amountUnit, price] = useWatch({ control, name: ["amount", "amountUnit", "price"] });

  const values = restockValues({ amount, amountUnit, price });
  const cost =
    values &&
    costPerUnit({
      packPriceMinor: values.pack_price_minor,
      packSize: values.pack_size,
      packSizeUnit: values.pack_size_unit,
      unit: target.unit,
    });

  const save = handleSubmit(async (form) => {
    const restock = restockValues(form);
    if (!restock) return;
    setProblem(null);
    try {
      await restockIngredient(db, { id: target.id, values: restock });
      onClose();
    } catch (error) {
      Sentry.captureException(error, { tags: { ingredient: "restock" } });
      setProblem("That didn’t save. Try again.");
    }
  });

  return (
    <BottomSheet
      open={open}
      title={`Restock — ${target.name}`}
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
        </>
      }
    >
      {/* A form, so the keyboard's Go key saves too. */}
      <form noValidate onSubmit={save}>
        <div className={styles.fields}>
          <Controller
            control={control}
            name="amount"
            render={({ field, fieldState }) => (
              <AmountField
                label="Amount bought"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                unit={amountUnit}
                units={unitsOfKind(unitKind(target.unit))}
                onUnitChange={(next) => setValue("amountUnit", next)}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="price"
            render={({ field, fieldState }) => (
              <TextField
                label="Price paid"
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
          {cost !== null && (
            <Notice variant="result" title="Works out to">
              {formatUnitCost(cost, currency, target.unit, "per")}
            </Notice>
          )}
        </div>
        {/* Lets Go on the keyboard submit; the visible Save is in the footer. */}
        <button type="submit" hidden />
      </form>
    </BottomSheet>
  );
}
