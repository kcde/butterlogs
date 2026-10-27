"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useId } from "react";
import { AmountField } from "@/components/AmountField";
import { Button } from "@/components/Button";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TextField } from "@/components/TextField";
import type { BasicsErrors, RecipeDraft, YieldType } from "@/lib/recipes";
import { unitsOfKind } from "@/lib/units";
import styles from "./newRecipe.module.css";

export interface BasicsStepProps {
  draft: RecipeDraft;
  update: (changes: Partial<RecipeDraft>) => void;
  errors: BasicsErrors;
  /** The chosen category's name, or null for none. */
  categoryName: string | null;
  onPickCategory: () => void;
}

const YIELDS = [
  { value: "weight", label: "Weight" },
  { value: "count", label: "Pieces" },
];

// NewRecipe1.dc.html: name, category, yield (plus an optional second figure) and notes (PRD F5).
export function BasicsStep({ draft, update, errors, categoryName, onPickCategory }: BasicsStepProps) {
  const categoryLabel = useId();
  const weight = draft.yieldType === "weight";

  const weightField = (label: string, hideLabel: boolean, error?: string) => (
    <AmountField
      label={label}
      hideLabel={hideLabel}
      value={draft.yieldWeight}
      onChange={(yieldWeight) => update({ yieldWeight })}
      unit={draft.yieldWeightUnit}
      units={unitsOfKind("weight")}
      onUnitChange={(yieldWeightUnit) => update({ yieldWeightUnit })}
      error={error}
    />
  );
  const countField = (label: string, hideLabel: boolean, error?: string) => (
    <TextField
      label={label}
      hideLabel={hideLabel}
      type="number"
      suffix="pcs"
      value={draft.yieldCount}
      onChange={(yieldCount) => update({ yieldCount })}
      error={error}
    />
  );

  return (
    <div className={styles.basics}>
      <TextField label="Recipe name" value={draft.name} onChange={(name) => update({ name })} error={errors.name} />

      <div className={styles.field}>
        <span id={categoryLabel} className={styles.label}>
          Category
        </span>
        <button
          type="button"
          className={styles.picker}
          aria-labelledby={`${categoryLabel} ${categoryLabel}-value`}
          aria-haspopup="dialog"
          onClick={onPickCategory}
        >
          <span id={`${categoryLabel}-value`} className={categoryName ? undefined : styles.placeholder}>
            {categoryName ?? "Uncategorised"}
          </span>
          <ChevronDown aria-hidden="true" />
        </button>
      </div>

      <div className={styles.yield}>
        <span className={styles.label}>Yield</span>
        <SegmentedControl
          label="Yield"
          options={YIELDS}
          value={draft.yieldType}
          onChange={(value) => update({ yieldType: value as YieldType })}
        />
        {weight ? weightField("Yield weight", true, errors.yield) : countField("Yield pieces", true, errors.yield)}
        {draft.secondYield ? (
          weight ? (
            countField("Pieces (optional)", false, errors.secondYield)
          ) : (
            weightField("Weight (optional)", false, errors.secondYield)
          )
        ) : (
          <span className={styles.also}>
            <Button variant="ghost" icon={<Plus />} onClick={() => update({ secondYield: true })}>
              {weight ? "Also add pieces (optional)" : "Also add weight (optional)"}
            </Button>
          </span>
        )}
      </div>

      <TextField
        label="Notes"
        multiline
        placeholder="e.g. Haano or Nescafé coffee"
        value={draft.notes}
        onChange={(notes) => update({ notes })}
      />
    </div>
  );
}
