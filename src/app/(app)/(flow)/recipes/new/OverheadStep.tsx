"use client";

import type { Ref } from "react";
import { ChoiceGrid } from "@/components/ChoiceGrid";
import { EditLineRow } from "@/components/EditLineRow";
import { StatTile } from "@/components/StatTile";
import { TextField } from "@/components/TextField";
import { WarningBanner } from "@/components/WarningBanner";
import { type CurrencyCode, currencySymbol } from "@/lib/currency";
import type { DraftOverhead, DraftPricing, RecipeDraft } from "@/lib/recipes";
import { AddButton } from "./AddButton";
import styles from "./newRecipe.module.css";

const METHODS = [
  { value: "markup", label: "Markup %" },
  { value: "margin", label: "Margin %" },
  { value: "fixed_profit", label: "Fixed profit" },
  { value: "set_price", label: "Set price" },
  { value: "cost_only", label: "Cost only" },
];

export interface OverheadStepProps {
  draft: RecipeDraft;
  update: (changes: Partial<RecipeDraft>) => void;
  currency: CurrencyCode;
  /** An overhead item's name ("Gas", or "Gas (deleted)"). */
  itemName: (id: string) => string;
  overheadTotal: string;
  invalid: ReadonlySet<string>;
  onTyped: (key: string) => void;
  register: (key: string) => Ref<HTMLInputElement>;
  pricingError?: string;
  onAddOverhead: () => void;
  /** The tiles, formatted. Cost only has no price or profit. */
  tiles: { value: string; label: string }[];
  /** "1 ingredient has no price, so these totals are incomplete." */
  incomplete: string | null;
}

// NewRecipe3.dc.html: overhead lines, the pricing method and the live totals (PRD F2, F7).
export function OverheadStep({
  draft,
  update,
  currency,
  itemName,
  overheadTotal,
  invalid,
  onTyped,
  register,
  pricingError,
  onAddOverhead,
  tiles,
  incomplete,
}: OverheadStepProps) {
  const setOverhead = (overhead: DraftOverhead[]) => update({ overhead });
  const method = draft.pricingMethod;
  const symbol = currencySymbol(currency);

  return (
    <div className={styles.overheadStep}>
      <section className={styles.card} aria-labelledby="overhead-title">
        <h2 id="overhead-title" className={styles.cardTitle}>
          Overhead
        </h2>
        {draft.overhead.length === 0 ? (
          <p className={styles.cardHint}>None yet. Add gas, labour and the rest this recipe uses.</p>
        ) : (
          <>
            <div className={styles.lines}>
              {draft.overhead.map((line) => (
                <EditLineRow
                  key={line.key}
                  name={itemName(line.overheadItemId)}
                  amount={line.amount}
                  prefix={symbol}
                  onAmountChange={(amount) => {
                    onTyped(line.key);
                    setOverhead(draft.overhead.map((other) => (other.key === line.key ? { ...other, amount } : other)));
                  }}
                  onRemove={() => setOverhead(draft.overhead.filter((other) => other.key !== line.key))}
                  invalid={invalid.has(line.key)}
                  inputRef={register(line.key)}
                />
              ))}
            </div>
            <div className={styles.total}>
              <span>Overhead total</span>
              <span>{overheadTotal}</span>
            </div>
          </>
        )}
      </section>
      <span className={styles.adds}>
        <AddButton onClick={onAddOverhead}>Add overhead item</AddButton>
      </span>

      <section className={styles.pricing} aria-labelledby="pricing-title">
        <h2 id="pricing-title" className={styles.cardTitle}>
          Pricing
        </h2>
        <ChoiceGrid
          label="Pricing"
          options={METHODS}
          value={method}
          onChange={(value) => update({ pricingMethod: value as DraftPricing })}
        />
        <div data-box="pricing">
          {(method === "markup" || method === "margin") && (
            <TextField
              label={method === "markup" ? "Markup" : "Margin"}
              type="number"
              suffix="%"
              value={draft.pricingPercent}
              onChange={(pricingPercent) => update({ pricingPercent })}
              error={pricingError}
            />
          )}
          {(method === "fixed_profit" || method === "set_price") && (
            <TextField
              label={method === "fixed_profit" ? "Profit" : "Price"}
              type="number"
              prefix={symbol}
              placeholder="0"
              value={draft.pricingAmount}
              onChange={(pricingAmount) => update({ pricingAmount })}
              error={pricingError}
            />
          )}
        </div>
      </section>

      {incomplete && <WarningBanner message={incomplete} />}
      <div className={styles.stats}>
        {tiles.map((tile) => (
          <StatTile key={tile.label} value={tile.value} label={tile.label} incomplete={incomplete !== null} />
        ))}
      </div>
    </div>
  );
}
