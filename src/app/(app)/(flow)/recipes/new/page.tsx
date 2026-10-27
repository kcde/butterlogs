"use client";

import { usePowerSync } from "@powersync/react";
import * as Sentry from "@sentry/nextjs";
import { useRouter } from "next/navigation";
import { type Ref, useCallback, useEffect, useRef, useState } from "react";
import { ActionBar } from "@/components/ActionBar";
import { Button } from "@/components/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StepIndicator } from "@/components/StepIndicator";
import { TopBar } from "@/components/TopBar";
import { subRecipeUnit } from "@/lib/calc/recipes";
import { priceFor } from "@/lib/calc/pricing";
import type { CurrencyCode } from "@/lib/currency";
import { useCategories } from "@/lib/db/categories";
import { deleteDraft, loadDraft, type Step, saveDraft } from "@/lib/db/drafts";
import { useIngredients } from "@/lib/db/ingredients";
import { useOverheadItems } from "@/lib/db/overhead";
import { saveNewRecipe, useRecipeCosts } from "@/lib/db/recipes";
import { formatMoney, formatRecipeUnitCost } from "@/lib/format";
import {
  type BasicsErrors,
  basicsErrors,
  blankDraft,
  type DraftSection,
  draftCostRecipe,
  draftPricing,
  draftTitle,
  hasContent,
  ingredientsEmptyBoxes,
  overheadEmptyBoxes,
  pricingError,
  type RecipeDraft,
  recipeRows,
} from "@/lib/recipes";
import { isUnit, unitLabel } from "@/lib/units";
import { IngredientSheet } from "../../../(tabs)/ingredients/IngredientSheet";
import { RestockSheet, type RestockTarget } from "../../../(tabs)/ingredients/RestockSheet";
import { useCurrentBusiness } from "../../../business";
import { AddLinesSheet, type LinesMode } from "./AddLinesSheet";
import { AddOverheadSheet } from "./AddOverheadSheet";
import { BasicsStep } from "./BasicsStep";
import { CategorySheet } from "./CategorySheet";
import { IngredientsStep, type LineLabel } from "./IngredientsStep";
import styles from "./newRecipe.module.css";
import { OverheadStep } from "./OverheadStep";

const STEP_NAMES = { 1: "Basics", 2: "Ingredients", 3: "Overhead & price" } as const;
const FILL_IN = "Fill in the boxes marked in red.";

type Sheet =
  | { kind: "category" }
  | { kind: "lines"; mode: LinesMode; sectionKey: string }
  | { kind: "new-ingredient"; sectionKey: string }
  | { kind: "restock"; sectionKey: string; target: RestockTarget }
  | { kind: "overhead" }
  | { kind: "leave" }
  | { kind: "remove-section"; section: DraftSection }
  | null;

const missingText = (count: number) =>
  `${count} ingredient${count === 1 ? " has" : "s have"} no price, so these totals are incomplete.`;

// NewRecipe1–3.dc.html: a new recipe in three steps (PRD F5). What she types is
// kept as a draft on this phone as she goes (agreed 27 Oct); ?draft=<id> opens one.
export default function NewRecipePage() {
  const router = useRouter();
  const db = usePowerSync();
  const business = useCurrentBusiness();
  const currency = business.currency_code as CurrencyCode;
  const { recipes, book, isLoading: costsLoading } = useRecipeCosts(business.id);
  const { ingredients, isLoading: ingredientsLoading } = useIngredients(business.id);
  const categories = useCategories(business.id);
  const overheadItems = useOverheadItems(business.id);

  // Tab and flow screens only render on the phone, so window is there.
  const [resumeId] = useState(() => new URLSearchParams(window.location.search).get("draft"));
  const [draftId] = useState(() => resumeId ?? crypto.randomUUID());
  const [recipeId] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState<RecipeDraft>(() =>
    blankDraft({ method: business.default_pricing_method, percent: business.default_pricing_percent }),
  );
  const [step, setStep] = useState<Step>(1);
  const [ready, setReady] = useState(resumeId === null);
  const [kept, setKept] = useState(resumeId !== null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [ticked, setTicked] = useState<string[]>([]);
  const [errors, setErrors] = useState<BasicsErrors & { pricing?: string }>({});
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const closing = useRef(false);
  const inputs = useRef(new Map<string, HTMLInputElement | null>());
  // A box to put the cursor in once it's on screen (new lines, or the first in red).
  const focusNext = useRef<string | null>(null);

  // Resume a draft from the Recipes list.
  useEffect(() => {
    if (resumeId === null) return;
    void loadDraft(db, resumeId).then((found) => {
      if (found) {
        setDraft(found.draft);
        setStep(found.step);
      }
      setReady(true);
    });
  }, [db, resumeId]);

  // Keep it as a draft while she types, once there's anything worth keeping.
  const keep = useCallback(async () => {
    await saveDraft(db, { id: draftId, businessId: business.id, draft, step });
    setKept(true);
    // A reload (or iOS reopening the page) then comes back to this draft, not a blank one.
    if (new URLSearchParams(window.location.search).get("draft") !== draftId) {
      window.history.replaceState(null, "", `/recipes/new?draft=${draftId}`);
    }
  }, [db, draftId, business.id, draft, step]);
  useEffect(() => {
    if (!ready || closing.current || (!kept && !hasContent(draft))) return;
    const timer = setTimeout(() => {
      if (!closing.current) void keep();
    }, 400);
    return () => clearTimeout(timer);
  }, [ready, kept, draft, keep]);

  // Asked for together with the change that shows the box, so it runs after that render.
  useEffect(() => {
    const key = focusNext.current;
    if (key === null) return;
    focusNext.current = null;
    const box = inputs.current.get(key) ?? document.querySelector<HTMLInputElement>(`[data-box="${key}"] input`);
    box?.scrollIntoView({ block: "center" });
    box?.focus();
  });
  const focus = (key: string) => {
    focusNext.current = key;
  };

  const register = useCallback(
    (key: string): Ref<HTMLInputElement> =>
      (element) => {
        inputs.current.set(key, element);
      },
    [],
  );

  const update = (changes: Partial<RecipeDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const typed = (key: string) =>
    setInvalid((current) => {
      if (!current.has(key)) return current;
      const next = new Set(current);
      next.delete(key);
      return next;
    });

  // Nothing until her recipes and ingredients are read: the name check and the
  // costs need them, and a quick tap on Next mustn't be checked against nothing.
  if (!ready || costsLoading || ingredientsLoading) return null;

  // Costs as she types: the draft is costed the same way as a saved recipe.
  const cost = book.recipeCost(draftCostRecipe(draft, recipeId));
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const label: LineLabel = (line) => {
    if (line.subRecipeId !== null) {
      const recipe = recipeById.get(line.subRecipeId);
      const unit = recipe
        ? subRecipeUnit({ yieldType: recipe.yield_type, yieldWeightG: recipe.yield_weight_g, yieldCount: recipe.yield_count })
        : null;
      return { name: recipe?.name ?? "Deleted recipe", unit: unit ? unitLabel(unit) : "" };
    }
    const ingredient = line.ingredientId === null ? undefined : ingredientById.get(line.ingredientId);
    return {
      name: ingredient?.name ?? "Deleted ingredient",
      unit: ingredient && isUnit(ingredient.unit) ? unitLabel(ingredient.unit) : "",
    };
  };
  const itemById = new Map(overheadItems.map((item) => [item.id, item.name ?? ""]));
  const categoryName = draft.categoryId ? (categories.find((c) => c.id === draft.categoryId)?.name ?? null) : null;

  function goTo(next: Step) {
    setStep(next);
    setInvalid(new Set());
    window.scrollTo(0, 0);
  }

  function showInvalid(keys: string[]) {
    setInvalid(new Set(keys));
    focus(keys[0]);
  }

  function checkBasics() {
    const found = basicsErrors(draft, recipes);
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  function next() {
    if (step === 1) {
      if (checkBasics()) goTo(2);
      return;
    }
    const keys = ingredientsEmptyBoxes(draft);
    if (keys.length > 0) showInvalid(keys);
    else goTo(3);
  }

  async function save() {
    const keys = overheadEmptyBoxes(draft);
    const pricing = pricingError(draft) ?? undefined;
    setErrors((current) => ({ ...current, pricing }));
    if (keys.length > 0) return showInvalid(keys);
    if (pricing) return focus("pricing");
    // Her list may have changed since step 1 (a name taken, a line emptied).
    if (!checkBasics()) return goTo(1);
    if (ingredientsEmptyBoxes(draft).length > 0) return goTo(2);

    setSaving(true);
    setProblem(null);
    closing.current = true;
    try {
      await saveNewRecipe(db, { rows: recipeRows(draft, { recipeId, businessId: business.id }), draftId });
      router.push(`/recipes?saved=${encodeURIComponent(draft.name.trim())}`);
    } catch (error) {
      closing.current = false;
      setSaving(false);
      Sentry.captureException(error, { tags: { recipe: "save" } });
      setProblem("That didn’t save. Try again.");
    }
  }

  async function leave(keepDraft: boolean) {
    closing.current = true;
    try {
      if (keepDraft) await keep();
      else if (kept) await deleteDraft(db, draftId);
    } catch (error) {
      Sentry.captureException(error, { tags: { recipe: keepDraft ? "keep-draft" : "discard-draft" } });
    }
    router.push("/recipes");
  }

  function close() {
    if (hasContent(draft)) setSheet({ kind: "leave" });
    else void leave(false);
  }

  function setSections(sections: DraftSection[]) {
    update({ sections });
  }

  function addLines(sectionKey: string, mode: LinesMode, ids: readonly string[]) {
    const lines = ids.map((id) => ({
      key: crypto.randomUUID(),
      ingredientId: mode === "ingredients" ? id : null,
      subRecipeId: mode === "recipes" ? id : null,
      amount: "",
    }));
    setSections(
      draft.sections.map((section) =>
        section.key === sectionKey ? { ...section, lines: [...section.lines, ...lines] } : section,
      ),
    );
    setSheet(null);
    setTicked([]);
    if (lines[0]) focus(lines[0].key);
  }

  function removeSection(section: DraftSection) {
    setSections(draft.sections.filter((other) => other.key !== section.key));
    setSheet(null);
  }

  const linesSheet = sheet?.kind === "lines" ? sheet : null;
  const linesSection = linesSheet ? draft.sections.find((section) => section.key === linesSheet.sectionKey) : undefined;
  const inSection = new Set(
    (linesSection?.lines ?? [])
      .map((line) => (linesSheet?.mode === "recipes" ? line.subRecipeId : line.ingredientId))
      .filter((id) => id !== null),
  );

  const per = draft.yieldType === "count" ? cost.perPieceMinor : cost.perGramMinor;
  const price = priceFor(cost.totalMinor, draftPricing(draft));
  const tiles = [
    { value: formatMoney(cost.totalMinor, currency), label: "Total cost" },
    {
      value: per === null ? "—" : formatRecipeUnitCost(per, currency, draft.yieldType === "count" ? "each" : "g"),
      label: draft.yieldType === "count" ? "Cost each" : "Cost per gram",
    },
    ...(draft.pricingMethod === "cost_only"
      ? []
      : [
          { value: price ? formatMoney(price.price, currency) : "—", label: "Selling price" },
          { value: price ? formatMoney(price.profit, currency) : "—", label: "Profit" },
        ]),
  ];

  const ingredientCost =
    cost.missing > 0
      ? { label: `Ingredient cost · ${cost.missing} has no price`, value: formatMoney(cost.ingredientsMinor, currency) }
      : { label: "Ingredient cost", value: formatMoney(cost.ingredientsMinor, currency) };

  return (
    <>
      <TopBar variant="flow" title={step === 1 ? "New recipe" : draftTitle(draft.name)} onClose={close} />
      <div className={styles.steps}>
        <StepIndicator step={step} total={3} label={STEP_NAMES[step]} />
      </div>

      {step === 1 && (
        <BasicsStep
          draft={draft}
          update={(changes) => {
            update(changes);
            setErrors({});
          }}
          errors={errors}
          categoryName={categoryName}
          onPickCategory={() => setSheet({ kind: "category" })}
        />
      )}
      {step === 2 && (
        <IngredientsStep
          sections={draft.sections}
          onSectionsChange={setSections}
          label={label}
          invalid={invalid}
          onTyped={typed}
          register={register}
          onAddLines={(sectionKey, mode) => {
            setTicked([]);
            setSheet({ kind: "lines", mode, sectionKey });
          }}
          onAddSection={() => {
            const key = crypto.randomUUID();
            setSections([...draft.sections, { key, name: "", lines: [] }]);
            focus(key);
          }}
          onRemoveSection={(section) =>
            section.lines.length === 0 ? removeSection(section) : setSheet({ kind: "remove-section", section })
          }
        />
      )}
      {step === 3 && (
        <OverheadStep
          draft={draft}
          update={(changes) => {
            update(changes);
            if ("pricingMethod" in changes || "pricingPercent" in changes || "pricingAmount" in changes) {
              setErrors((current) => ({ ...current, pricing: undefined }));
            }
          }}
          currency={currency}
          itemName={(id) => itemById.get(id) ?? "Deleted item"}
          overheadTotal={formatMoney(cost.overheadMinor, currency)}
          invalid={invalid}
          onTyped={typed}
          register={register}
          pricingError={errors.pricing}
          onAddOverhead={() => setSheet({ kind: "overhead" })}
          tiles={tiles}
          incomplete={cost.missing > 0 ? missingText(cost.missing) : null}
        />
      )}

      <ActionBar
        summary={step === 2 ? ingredientCost : undefined}
        message={problem ?? (invalid.size > 0 ? FILL_IN : undefined)}
      >
        {step > 1 && <Button onClick={() => goTo((step - 1) as Step)}>Back</Button>}
        {step < 3 ? (
          <Button variant="primary" onClick={next}>
            Next
          </Button>
        ) : (
          <Button variant="primary" disabled={saving} onClick={() => void save()}>
            Save recipe
          </Button>
        )}
      </ActionBar>

      <CategorySheet
        open={sheet?.kind === "category"}
        businessId={business.id}
        categories={categories}
        value={draft.categoryId}
        onPick={(categoryId) => {
          update({ categoryId });
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <AddLinesSheet
        open={linesSheet !== null}
        mode={linesSheet?.mode ?? "ingredients"}
        currency={currency}
        ingredients={ingredients}
        recipes={recipes}
        subRecipeCost={book.subRecipeUnitCost}
        inSection={inSection}
        ticked={ticked}
        onTickedChange={setTicked}
        onAdd={() => linesSheet && addLines(linesSheet.sectionKey, linesSheet.mode, ticked)}
        onNewIngredient={() => linesSheet && setSheet({ kind: "new-ingredient", sectionKey: linesSheet.sectionKey })}
        onClose={() => setSheet(null)}
      />
      {/* New ingredient → Restock → back to Add ingredients with it ticked (agreed 27 Oct). */}
      {sheet?.kind === "new-ingredient" && (
        <IngredientSheet
          open
          ingredient={null}
          ingredients={ingredients}
          usedIn={0}
          businessId={business.id}
          currency={currency}
          onClose={() => setSheet({ kind: "lines", mode: "ingredients", sectionKey: sheet.sectionKey })}
          onRestock={(target) => setSheet({ kind: "restock", sectionKey: sheet.sectionKey, target })}
          onDelete={() => {}}
        />
      )}
      {sheet?.kind === "restock" && (
        <RestockSheet
          open
          target={sheet.target}
          currency={currency}
          onClose={() => {
            setTicked((current) => [...current, sheet.target.id]);
            setSheet({ kind: "lines", mode: "ingredients", sectionKey: sheet.sectionKey });
          }}
        />
      )}
      <AddOverheadSheet
        open={sheet?.kind === "overhead"}
        businessId={business.id}
        items={overheadItems}
        added={new Set(draft.overhead.map((line) => line.overheadItemId))}
        onAdd={(ids) => {
          const lines = ids.map((overheadItemId) => ({ key: crypto.randomUUID(), overheadItemId, amount: "" }));
          update({ overhead: [...draft.overhead, ...lines] });
          setSheet(null);
          if (lines[0]) focus(lines[0].key);
        }}
        onClose={() => setSheet(null)}
      />

      <ConfirmDialog
        open={sheet?.kind === "leave"}
        title={draft.name.trim() ? `Keep ${draft.name.trim()} as a draft?` : "Keep this recipe as a draft?"}
        body="You can finish it later from Recipes."
        cancelLabel="Keep as draft"
        confirmLabel="Discard"
        onCancel={() => void leave(true)}
        onConfirm={() => void leave(false)}
        onDismiss={() => setSheet(null)}
      />
      {sheet?.kind === "remove-section" && (
        <ConfirmDialog
          open
          icon="trash"
          title={`Remove ${sheet.section.name.trim() || "this section"}?`}
          body={`Its ${sheet.section.lines.length} ingredient${sheet.section.lines.length === 1 ? "" : "s"} will be removed too.`}
          cancelLabel="Cancel"
          confirmLabel="Remove"
          onCancel={() => setSheet(null)}
          onConfirm={() => removeSection(sheet.section)}
        />
      )}
    </>
  );
}
