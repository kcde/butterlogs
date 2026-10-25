"use client";

import { usePowerSync } from "@powersync/react";
import * as Sentry from "@sentry/nextjs";
import { Package } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { IngredientCard } from "@/components/IngredientCard";
import { SearchField } from "@/components/SearchField";
import { TopBar } from "@/components/TopBar";
import { costPerUnit } from "@/lib/calc/ingredients";
import type { CurrencyCode } from "@/lib/currency";
import { deleteIngredient, type IngredientRow, useIngredients, useRecipesUsing } from "@/lib/db/ingredients";
import { formatMoney, formatPackSize, formatUnitCost, formatUpdated } from "@/lib/format";
import { matchesName } from "@/lib/search";
import { isUnit } from "@/lib/units";
import { useCurrentBusiness } from "../business";
import { SyncPill } from "../SyncPill";
import { IngredientSheet } from "./IngredientSheet";
import styles from "./ingredients.module.css";

/** "₦1.20 / g", or null for a missing price. */
function unitCost(ingredient: IngredientRow, currency: CurrencyCode) {
  const cost = costPerUnit({
    packPriceMinor: ingredient.pack_price_minor,
    packSize: ingredient.pack_size,
    packSizeUnit: ingredient.pack_size_unit,
    unit: ingredient.unit ?? "",
  });
  return cost === null || !isUnit(ingredient.unit) ? null : formatUnitCost(cost, currency, ingredient.unit);
}

/** "12.5 kg · ₦15,000 · updated 2 weeks ago". Only shown with a price, so the pack details are there. */
function meta(ingredient: IngredientRow, currency: CurrencyCode, now: Date) {
  const { pack_size, pack_size_unit, pack_price_minor, price_updated_at } = ingredient;
  if (pack_size === null || !isUnit(pack_size_unit) || pack_price_minor === null) return undefined;
  const updated = price_updated_at ? formatUpdated(price_updated_at, now) : null;
  return [formatPackSize(pack_size, pack_size_unit), formatMoney(pack_price_minor, currency), updated && `updated ${updated}`]
    .filter(Boolean)
    .join(" · ");
}

// One sheet session: a new ingredient (null) or the one being edited. `id`
// gives each session a fresh form.
type Session = { id: number; ingredient: IngredientRow | null };

// Ingredients.dc.html, IngredientsDark.dc.html and EmptyIngredients.dc.html.
export default function IngredientsPage() {
  const db = usePowerSync();
  const business = useCurrentBusiness();
  const currency = business.currency_code as CurrencyCode;
  const { ingredients, isLoading } = useIngredients(business.id);
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [step, setStep] = useState<"sheet" | "delete">("sheet");
  const editing = session?.ingredient ?? null;
  const usedIn = useRecipesUsing(editing?.id ?? null);
  const now = new Date();

  function open(ingredient: IngredientRow | null) {
    setSession({ id: (session?.id ?? 0) + 1, ingredient });
    setStep("sheet");
  }

  async function confirmDelete() {
    if (!editing) return;
    try {
      await deleteIngredient(db, editing.id);
    } catch (error) {
      Sentry.captureException(error, { tags: { ingredient: "delete" } });
    }
    setSession(null);
  }

  const visible = ingredients.filter((ingredient) => matchesName(ingredient.name ?? "", query));
  const name = editing?.name ?? "";

  return (
    <>
      <TopBar variant="tab" title="Ingredients" trailing={<SyncPill />} />
      {isLoading ? null : ingredients.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="No ingredients yet"
          body="Add what you buy and what you paid for the pack. We work out the cost per gram or per piece."
          primaryAction={{ label: "Add your first ingredient", onClick: () => open(null) }}
          footnote="Cake boxes, bags and liners count too. Add them in pieces (pcs)."
        />
      ) : (
        <>
          <div className={styles.search}>
            <SearchField value={query} onChange={setQuery} placeholder="Search ingredients" />
          </div>
          {visible.length > 0 ? (
            <ul className={styles.list}>
              {visible.map((ingredient) => (
                <li key={ingredient.id}>
                  <IngredientCard
                    name={ingredient.name ?? ""}
                    unitCost={unitCost(ingredient, currency)}
                    meta={meta(ingredient, currency, now)}
                    onClick={() => open(ingredient)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.none}>No ingredients match “{query.trim()}”.</p>
          )}
          <FAB label="New ingredient" onClick={() => open(null)} />
        </>
      )}

      {session && (
        <IngredientSheet
          key={session.id}
          open={step === "sheet"}
          ingredient={session.ingredient}
          ingredients={ingredients}
          usedIn={usedIn.length}
          businessId={business.id}
          currency={currency}
          onClose={() => setSession(null)}
          onDelete={() => setStep("delete")}
        />
      )}

      {/* DeleteIngredient.dc.html. Keep goes back to the sheet, edits and all. */}
      {editing &&
        (usedIn.length > 0 ? (
          <ConfirmDialog
            open={step === "delete"}
            icon="alert"
            title={`${name} is in ${usedIn.length} recipe${usedIn.length === 1 ? "" : "s"}`}
            body="If you delete it, those recipes will show it as missing and their totals will be incomplete."
            affected={usedIn.map((recipe) => recipe.name ?? "")}
            confirmLabel="Delete anyway"
            cancelLabel={`Keep ${name}`}
            layout="stack"
            onConfirm={() => void confirmDelete()}
            onCancel={() => setStep("sheet")}
          />
        ) : (
          <ConfirmDialog
            open={step === "delete"}
            icon="trash"
            title={`Delete ${name}?`}
            body="This can’t be undone. No recipes use it."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            onConfirm={() => void confirmDelete()}
            onCancel={() => setStep("sheet")}
          />
        ))}
    </>
  );
}
