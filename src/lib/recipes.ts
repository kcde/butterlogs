// The new-recipe flow's rules (PRD F5, F7): what a draft holds, what each step
// needs before she can move on, and the rows a finished draft becomes. Checked
// in the app; the server only refuses what can never happen here (PRD §6).

import type { CostRecipe } from "./calc/recipes";
import { isValidMargin, type Pricing, type PricingMethod } from "./calc/pricing";
import { nameTaken } from "./names";
import { parseNumber, toMinor } from "./parse";
import { convert, type Unit } from "./units";

export type YieldType = "weight" | "count";
/** The four methods, or Cost only (no selling price: fillings), agreed 27 Oct. */
export type DraftPricing = PricingMethod | "cost_only";

/** Lines and overhead rows keep a key from the start: it becomes the row's id on Save. */
export interface DraftLine {
  key: string;
  ingredientId: string | null;
  subRecipeId: string | null;
  /** As typed: in the ingredient's unit, or g or pcs for a sub-recipe. */
  amount: string;
}

export interface DraftSection {
  key: string;
  /** Always empty for the first section (agreed 27 Oct); required for the others. */
  name: string;
  lines: DraftLine[];
}

export interface DraftOverhead {
  key: string;
  overheadItemId: string;
  /** ₦ as typed. */
  amount: string;
}

/** Everything typed into the three steps, as text, so it can be kept as a draft (JSON) at any point. */
export interface RecipeDraft {
  name: string;
  categoryId: string | null;
  notes: string;
  yieldType: YieldType;
  yieldWeight: string;
  yieldWeightUnit: Unit;
  yieldCount: string;
  /** "Also add pieces" (or weight) was tapped: the optional second figure is shown. */
  secondYield: boolean;
  sections: DraftSection[];
  overhead: DraftOverhead[];
  pricingMethod: DraftPricing;
  pricingPercent: string;
  pricingAmount: string;
}

const usesPercent = (method: DraftPricing) => method === "markup" || method === "margin";

/** A new recipe: one unnamed section, no overhead, the business's default pricing. */
export function blankDraft(
  defaults: { method: string | null; percent: number | null },
  newKey: () => string = () => crypto.randomUUID(),
): RecipeDraft {
  const method = (defaults.method ?? "markup") as PricingMethod;
  return {
    name: "",
    categoryId: null,
    notes: "",
    yieldType: "weight",
    yieldWeight: "",
    yieldWeightUnit: "g",
    yieldCount: "",
    secondYield: false,
    sections: [{ key: newKey(), name: "", lines: [] }],
    overhead: [],
    pricingMethod: method,
    // Fixed profit and set price amounts are typed per recipe (PRD §6, businesses).
    pricingPercent: usesPercent(method) && defaults.percent !== null ? String(defaults.percent) : "",
    pricingAmount: "",
  };
}

/** True once she has typed or picked anything worth keeping as a draft. */
export function hasContent(draft: RecipeDraft) {
  return (
    draft.name.trim() !== "" ||
    draft.notes.trim() !== "" ||
    draft.categoryId !== null ||
    draft.yieldWeight.trim() !== "" ||
    draft.yieldCount.trim() !== "" ||
    draft.sections.length > 1 ||
    draft.sections.some((section) => section.lines.length > 0) ||
    draft.overhead.length > 0
  );
}

/** "Untitled recipe" until she names it. */
export function draftTitle(name: string | null) {
  return name?.trim() || "Untitled recipe";
}

const positive = (text: string) => (parseNumber(text) ?? 0) > 0;

function weightInGrams(draft: RecipeDraft) {
  const weight = parseNumber(draft.yieldWeight);
  return weight === null || weight <= 0 ? null : convert(weight, draft.yieldWeightUnit, "g");
}

function countValue(draft: RecipeDraft) {
  const count = parseNumber(draft.yieldCount);
  return count === null || count <= 0 ? null : count;
}

/** The yields as stored: the main one, plus the second figure only when it's shown and filled. */
function yields(draft: RecipeDraft) {
  const weight = draft.yieldType === "weight" || draft.secondYield ? weightInGrams(draft) : null;
  const count = draft.yieldType === "count" || draft.secondYield ? countValue(draft) : null;
  return { yieldWeightG: weight, yieldCount: count };
}

export interface BasicsErrors {
  name?: string;
  yield?: string;
  secondYield?: string;
}

/** Step 1: a name she hasn't used (ignoring capitals) and the yield; the second figure is optional but must be a number. */
export function basicsErrors(draft: RecipeDraft, recipes: readonly { id: string; name: string | null }[]) {
  const errors: BasicsErrors = {};
  const taken = nameTaken(draft.name, recipes);
  if (draft.name.trim() === "") errors.name = "Add a name.";
  else if (taken) errors.name = `You already have ${taken.name}.`;

  const weight = draft.yieldType === "weight";
  if (!positive(weight ? draft.yieldWeight : draft.yieldCount)) {
    errors.yield = weight ? "Type the weight, like 1,500." : "Type how many, like 24.";
  }
  const second = weight ? draft.yieldCount : draft.yieldWeight;
  if (draft.secondYield && second.trim() !== "" && !positive(second)) {
    errors.secondYield = weight ? "Type how many, like 24, or leave it empty." : "Type the weight, like 1,200, or leave it empty.";
  }
  return errors;
}

/**
 * Step 2's boxes that must be filled before Next, in screen order: every
 * section after the first needs a name, and every line an amount above 0
 * (the server refuses 0). Their keys get the red outline (agreed 27 Oct).
 */
export function ingredientsEmptyBoxes(draft: RecipeDraft) {
  const keys: string[] = [];
  draft.sections.forEach((section, index) => {
    if (index > 0 && section.name.trim() === "") keys.push(section.key);
    for (const line of section.lines) if (!positive(line.amount)) keys.push(line.key);
  });
  return keys;
}

/** Step 3's overhead boxes left empty (₦0 is fine) before Save. */
export function overheadEmptyBoxes(draft: RecipeDraft) {
  return draft.overhead.filter((line) => parseNumber(line.amount) === null).map((line) => line.key);
}

/** What's wrong with the pricing value, if anything. Cost only needs nothing. */
export function pricingError(draft: RecipeDraft) {
  const { pricingMethod: method } = draft;
  if (method === "cost_only") return null;
  if (usesPercent(method)) {
    const percent = parseNumber(draft.pricingPercent);
    if (percent === null) return "Type a percentage.";
    if (method === "margin" && !isValidMargin(percent)) return "Margin must be under 100%.";
    return null;
  }
  if (parseNumber(draft.pricingAmount) !== null) return null;
  return method === "fixed_profit" ? "Type the profit, like 2,000." : "Type the price, like 15,000.";
}

/** The pricing for the maths (calc/pricing.ts); Cost only has no method. */
export function draftPricing(draft: RecipeDraft): Pricing {
  const method = draft.pricingMethod === "cost_only" ? null : draft.pricingMethod;
  const amount = parseNumber(draft.pricingAmount);
  return {
    method,
    percent: method !== null && usesPercent(method) ? parseNumber(draft.pricingPercent) : null,
    amountMinor: method === "fixed_profit" || method === "set_price" ? (amount === null ? null : toMinor(amount)) : null,
  };
}

/** The draft as the cost maths sees it, while she types: an amount not typed yet counts as 0. */
export function draftCostRecipe(draft: RecipeDraft, id: string): CostRecipe {
  return {
    id,
    deletedAt: null,
    yieldType: draft.yieldType,
    ...yields(draft),
    lines: draft.sections.flatMap((section) =>
      section.lines.map((line) => ({
        ingredientId: line.ingredientId,
        subRecipeId: line.subRecipeId,
        amount: parseNumber(line.amount) ?? 0,
      })),
    ),
    overheadMinor: draft.overhead.map((line) => toMinor(parseNumber(line.amount) ?? 0)),
  };
}

/**
 * The rows a finished draft becomes. Assumes every step's checks passed. The
 * first section's name is stored empty (PRD §6), positions run 1…n, and the
 * draft's keys become the rows' ids.
 */
export function recipeRows(draft: RecipeDraft, { recipeId, businessId }: { recipeId: string; businessId: string }) {
  const { method, percent, amountMinor } = draftPricing(draft);
  const { yieldWeightG, yieldCount } = yields(draft);
  const business_id = businessId;
  const notes = draft.notes.trim();
  return {
    recipe: {
      id: recipeId,
      business_id,
      name: draft.name.trim(),
      category_id: draft.categoryId,
      notes: notes === "" ? null : notes,
      yield_type: draft.yieldType,
      yield_weight_g: yieldWeightG,
      yield_count: yieldCount,
      pricing_method: method,
      pricing_percent: percent,
      pricing_amount_minor: amountMinor,
    },
    sections: draft.sections.map((section, index) => ({
      id: section.key,
      business_id,
      recipe_id: recipeId,
      name: index === 0 ? null : section.name.trim(),
      position: index + 1,
    })),
    lines: draft.sections.flatMap((section) =>
      section.lines.map((line, index) => ({
        id: line.key,
        business_id,
        recipe_id: recipeId,
        section_id: section.key,
        position: index + 1,
        ingredient_id: line.ingredientId,
        sub_recipe_id: line.subRecipeId,
        amount: parseNumber(line.amount) as number,
      })),
    ),
    overhead: draft.overhead.map((line, index) => ({
      id: line.key,
      business_id,
      recipe_id: recipeId,
      overhead_item_id: line.overheadItemId,
      amount_minor: toMinor(parseNumber(line.amount) as number),
      position: index + 1,
    })),
  };
}

export type RecipeRows = ReturnType<typeof recipeRows>;
