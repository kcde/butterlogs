"use client";

import { BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Chip } from "@/components/Chip";
import { EmptyState } from "@/components/EmptyState";
import { FAB } from "@/components/FAB";
import { RecipeCard, type RecipeCardProps } from "@/components/RecipeCard";
import { SearchField } from "@/components/SearchField";
import { Toast } from "@/components/Toast";
import { TopBar } from "@/components/TopBar";
import type { RecipeCost } from "@/lib/calc/recipes";
import type { CurrencyCode } from "@/lib/currency";
import { useCategories } from "@/lib/db/categories";
import { useDrafts } from "@/lib/db/drafts";
import { type RecipeRow, useRecipeCosts } from "@/lib/db/recipes";
import { formatAmount, formatMoney, formatRecipeUnitCost, parseTimestamp } from "@/lib/format";
import { draftTitle } from "@/lib/recipes";
import { matchesName } from "@/lib/search";
import { useCurrentBusiness } from "../../business";
import { InstallGuide, isInstalled } from "../InstallGuide";
import { SyncPill } from "../SyncPill";
import styles from "./recipes.module.css";

/** "1,500 g · ₦10,287 · ₦6.86/g", by the recipe's own yield type. */
function cardText(recipe: RecipeRow, cost: RecipeCost | null, currency: CurrencyCode) {
  const count = recipe.yield_type === "count";
  const yieldLabel = count ? formatAmount(recipe.yield_count ?? 0, "pcs") : formatAmount(recipe.yield_weight_g ?? 0, "g");
  if (!cost) return { yieldLabel };
  if (cost.missing > 0) return { yieldLabel, incomplete: { missingCount: cost.missing } };
  const per = count ? cost.perPieceMinor : cost.perGramMinor;
  return {
    yieldLabel,
    totalCost: formatMoney(cost.totalMinor, currency),
    unitCost: per === null ? undefined : formatRecipeUnitCost(per, currency, count ? "each" : "g"),
  };
}

type Item = { key: string; name: string; categoryId: string | null; updated: number; card: RecipeCardProps };

const ALL = "all";
const UNCATEGORISED = "none";
const time = (text: string | null) => (text ? (parseTimestamp(text)?.getTime() ?? 0) : 0);

// Main.dc.html, RecipesDark.dc.html and EmptyRecipes.dc.html.
export default function RecipesPage() {
  const router = useRouter();
  const business = useCurrentBusiness();
  const currency = business.currency_code as CurrencyCode;
  const { recipes, costOf, isLoading } = useRecipeCosts(business.id);
  const drafts = useDrafts(business.id);
  const categories = useCategories(business.id);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState(ALL);

  // Setup sends her here with ?install=1: offer the install guide once, unless
  // she's already using the app from her home screen. The new-recipe flow
  // sends ?saved=<name> for the toast. (Tab screens only render on the phone,
  // after the session check, so window is there.)
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const [installOpen, setInstallOpen] = useState(() => params.get("install") === "1" && !isInstalled());
  const saved = params.get("saved");
  // Tidies the address without navigating: offline, router.replace would
  // reload the page and lose the toast.
  useEffect(() => {
    if (saved) window.history.replaceState(null, "", "/recipes");
  }, [saved]);

  function closeInstall() {
    setInstallOpen(false);
    router.replace("/recipes");
  }

  const categoryName = new Map(categories.map((category) => [category.id, category.name ?? ""]));
  // Most recently updated first, drafts included (agreed 27 Oct).
  const items: Item[] = [
    ...recipes.map((recipe) => ({
      key: recipe.id,
      name: recipe.name ?? "",
      categoryId: recipe.category_id,
      updated: time(recipe.updated_at),
      card: {
        name: recipe.name ?? "",
        category: recipe.category_id ? categoryName.get(recipe.category_id) : null,
        ...cardText(recipe, costOf(recipe.id), currency),
      },
    })),
    ...drafts.data.map((draft) => ({
      key: draft.id,
      name: draftTitle(draft.name),
      categoryId: draft.category_id,
      updated: time(draft.updated_at),
      card: {
        name: draftTitle(draft.name),
        yieldLabel: "",
        draft: true,
        onClick: () => router.push(`/recipes/new?draft=${draft.id}`),
      },
    })),
  ].sort((a, b) => b.updated - a.updated);

  const anyUncategorised = items.some((item) => item.categoryId === null);
  const chips = [
    { value: ALL, label: "All" },
    ...categories.map((category) => ({ value: category.id, label: category.name ?? "" })),
    ...(anyUncategorised ? [{ value: UNCATEGORISED, label: "Uncategorised" }] : []),
  ];
  // A chip that no longer applies (its last recipe moved) falls back to All.
  const selected = chips.some((option) => option.value === chip) ? chip : ALL;
  const visible = items.filter(
    (item) =>
      matchesName(item.name, query) &&
      (selected === ALL || (selected === UNCATEGORISED ? item.categoryId === null : item.categoryId === selected)),
  );

  const loading = isLoading || drafts.isLoading;
  return (
    <>
      <TopBar variant="tab" title="Recipes" trailing={<SyncPill />} />
      {loading ? null : items.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="No recipes yet"
          body="Add your ingredients and what you paid for them first. Then every recipe can work out its own cost."
          primaryAction={{ label: "Add ingredients", href: "/ingredients" }}
          secondaryAction={{ label: "Start a recipe anyway", href: "/recipes/new" }}
          footnote="Gas, electricity, transport, labour and packaging are already set up as overhead items."
        />
      ) : (
        <>
          <div className={styles.search}>
            <SearchField value={query} onChange={setQuery} placeholder="Search recipes" />
          </div>
          <div className={styles.chips}>
            {chips.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={option.value === selected}
                onClick={() => setChip(option.value)}
              />
            ))}
          </div>
          {visible.length > 0 ? (
            <ul className={styles.list}>
              {visible.map((item) => (
                <li key={item.key}>
                  <RecipeCard {...item.card} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.none}>
              {query.trim() ? `No recipes match “${query.trim()}”.` : "No recipes in this category yet."}
            </p>
          )}
          <FAB label="New recipe" href="/recipes/new" />
        </>
      )}
      {saved && <Toast message={`${saved} saved`} />}
      <InstallGuide open={installOpen} onClose={closeInstall} />
    </>
  );
}
