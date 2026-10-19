# Butterlogs — Build Plan

The detailed version of PRD section 8. The PRD says **what** to build; this file breaks each milestone into tasks and records **where we are**.

- Work one milestone at a time. Don't start the next until Keside says go.
- Tick tasks as they're done. When a milestone finishes, set its status, add the date, and write 2–3 lines in its **Notes**.
- If a task here and the PRD disagree, the PRD wins. Fix this file.
- Screens are named by their mockup file (`Recipe.dc.html` → *Recipe*). Components are named as in the design system.

## Status

| # | Milestone | Features | Status | Finished |
|---|---|---|---|---|
| M0 | Accounts and project setup | — | Done | 19 Oct 2026 |
| M1 | Offline spike on an iPhone | F8 (proof) | Done | 19 Oct 2026 |
| M2 | Full data model | All (data) | Not started | |
| M3 | Tokens and components | F9 (look) | Not started | |
| M4 | Calculation engine | F3, F5, F6, F7 (maths) | Not started | |
| M5 | Getting started | F1, F9 | Not started | |
| M6 | Ingredients | F3 | Not started | |
| M7 | Recipes | F4, F5, F6, F7 | Not started | |
| M8 | New recipe flow | F4, F5, F7 | Not started | |
| M9 | Settings and sync | F1, F2, F4, F8, F9 | Not started | |
| M10 | Load her spreadsheet | — | Not started | |
| M11 | Hardening | F6, F8, F9 | Not started | |
| M12 | Pilot | — | Not started | |

Statuses: Not started · In progress · Done · Blocked (say why in Notes).

---

## M0 — Accounts and project setup

**Goal:** every account exists, the project is set up, and Claude Code can read the docs and both artifacts.

**Project (Claude)**
- [x] Next.js 16 app at the repo root (TypeScript, App Router, `src/`, ESLint, Turbopack; no Tailwind)
- [x] Stack installed: Supabase, PowerSync, Serwist (`@serwist/turbopack`), React Hook Form, Zod, lucide-react, Sentry, Vitest, Playwright, axe
- [x] ~~Postinstall copies PowerSync worker files to `public/@powersync/`~~ (removed in M1: Turbopack bundles them)
- [x] Vitest and Playwright configs (390 × 844, light + dark)
- [x] `.env.example`, `.gitignore`, folders from `building-in-code.md`
- [x] PRD at `docs/prd.md`; commands filled in in `CLAUDE.md`
- [x] Both artifact links open in Claude Code
- [x] First commit

**Accounts (Keside)**
- [x] GitHub repo pushed
- [x] Supabase project (note the region: close to Nigeria)
- [x] PowerSync instance, connected to the Supabase project (powersync_role, publication, Supabase auth)
- [x] Vercel project linked to the GitHub repo (done in M1)
- [x] Sentry project (Next.js), org `keside`, project `butterlogs`; test error received
- [x] Keys in `.env.local` (see `.env.example`); Vercel copies go in with the Vercel project in M1

**Done when:** keys are in `.env.local`, and both artifact links open in Claude Code.

**Notes**
- 17 Oct 2026: project set up; typecheck, lint, tests and build pass. Waiting on accounts.
- 19 Oct 2026: Supabase, PowerSync and Sentry connected. Sentry's wizard also set up the SDK (pulled forward from M11); Session Replay removed, DSN read from `NEXT_PUBLIC_SENTRY_DSN`.

---

## M1 — Offline spike on an iPhone (Keside's)

**Goal:** prove the riskiest part of the stack, offline add-and-sync on a real iPhone, before building on it. Code here is allowed to be rough; M2 replaces the schema.

**PRD:** §1 Platform, §5, §6 PowerSync, F8.

**Supabase**
- [ ] Enable email + password auth; turn off email confirmation for the spike if it gets in the way
- [x] Supabase CLI added; migrations in `supabase/migrations/`
- [x] Spike `ingredients` table with RLS limiting each row to its owner (applied with `npx supabase db push`). M2 moves to `business_id` and `is_member`
- [x] `powersync_role` and `powersync` publication (`FOR ALL TABLES`); PowerSync connects as `powersync_role`

**PowerSync**
- [x] Supabase auth turned on in the PowerSync instance (M0)
- [x] One sync stream (edition 3) for the spike table (`powersync/sync-config.yaml`, deployed from the dashboard)
- [x] Client schema for the table (`src/lib/db/`)
- [x] Client-only PowerSync provider; nothing server-rendered reads data
- [x] Upload connector through supabase-js with the user's session (upsert / update / delete)

**PWA**
- [x] Serwist service worker with `@serwist/turbopack`; app shell, fonts and the SQLite `.wasm` precached so it opens offline
- [x] Service worker never caches Sentry's `/monitoring` tunnel route
- [x] Web manifest: name, standalone display, `theme-color` light `#ffffff` / dark `#0c0a09`, placeholder icon
- [x] `viewport-fit=cover`
- [x] Production build creates and registers the service worker (`/serwist/sw.js`, 56 precache entries, ~4.2 MB)

**Screens (bare, unstyled)**
- [x] Log in page (email + password)
- [x] Ingredient list + add form

**Font check (PRD §11)**
- [x] Noto Sans via `next/font` (latin + latin-ext)
- [ ] ₦ and tabular figures render on the iPhone: not confirmed in M1; carried to the M11 real-iPhone pass

**Deploy and test**
- [x] Vercel project linked to the repo, with the `.env.local` keys (except `SUPABASE_SECRET_KEY`)
- [x] Deployed to Vercel
- [x] Installed from Safari on Keside's iPhone; opens full screen
- [x] Desktop Chrome: offline add → back online → row in Supabase with no refresh (reconnects on the `online` event)
- [x] Airplane mode → add an ingredient → reconnect → row appears in Supabase

**Done when:** installed from Safari on Keside's iPhone, an ingredient added in airplane mode appears in Supabase after reconnecting.

**Notes**
- 19 Oct 2026: code done; offline add-and-sync passes in desktop Chrome. Fixed: PowerSync didn't reconnect until a refresh, so the app now reconnects on the browser's `online` event. Waiting on Vercel and the iPhone test.
- 19 Oct 2026: done. On Keside's iPhone, offline adds show as waiting and upload on reconnect. Verdict: stay with PowerSync; the snags were service-worker caching and reconnect timing, both fixed. Next: M2, the full data model.

---

## M2 — Full data model

**Goal:** the real database, its security, and sync, all tested with two businesses.

**PRD:** §6 (all of it).

**Migrations** *(proposal: add the Supabase CLI and keep migrations in `supabase/migrations/`; to discuss at the start of M2)*
- [ ] Drop the M1 spike table
- [ ] Ten tables from §6 with the exact column types (money `bigint`, amounts `double precision`, ordering `position double precision`)
- [ ] `created_at` / `updated_at` on every table; `set_updated_at` trigger on every table
- [ ] Composite unique `(business_id, id)` on every parent table, and composite foreign keys from every child
- [ ] `recipes.category_id` → `ON DELETE SET NULL`
- [ ] Server checks that can never fail on valid app data: exactly one of `ingredient_id` / `sub_recipe_id`; `amount > 0`; `amount_minor >= 0`; `yield_type` and `pricing_method` values; `business_members` unique `(business_id, user_id)`
- [ ] Soft delete `deleted_at` on `ingredients`, `overhead_items`, `recipes`

**Functions and triggers**
- [ ] `is_member(business_id)`: security definer, stable
- [ ] `create_business(name, currency, method, percent, amount)`: one transaction; business + owner row + five starter overhead items (Gas, Electricity, Transport, Labour, Packaging); refuses a second business
- [ ] `record_price_history`: after insert/update on `ingredients` when price, size or size unit changes

**Row Level Security**
- [ ] Business data tables: select / insert / update / delete when `is_member(business_id)`, using and with check
- [ ] `businesses`: select and update for members; no insert or delete
- [ ] `business_members`: select own rows only; writes only through `create_business`
- [ ] `ingredient_price_history`: no app access

**PowerSync**
- [ ] Publication lists every synced table (all except price history). M0 created it `FOR ALL TABLES`: drop and recreate it with the explicit list
- [ ] Sync stream from §6, with the `with:` block for the user's businesses (check syntax against PowerSync's "Writing queries" docs)
- [ ] Full client schema in `src/lib/db/` (uuid/text/timestamptz → text, bigint → integer, double → real)
- [ ] Upload connector: temporary errors retry; permanent errors (rejected data, RLS) drop the change. Sentry reporting is wired in M11; the message to her is in M9

**Tests**
- [ ] RLS test with two businesses: each sees and changes only its own rows, directly and through PowerSync
- [ ] Composite keys block a reference to another business's row
- [ ] A price change writes one history row; a notes change writes none
- [ ] `create_business` creates five overhead items and refuses a second call

**Done when:** the two-business RLS test passes, directly and through PowerSync, and a price change writes a history row.

**Notes**

---

## M3 — Tokens and components

**Goal:** the whole design system in code, viewable on one page.

**Sources:** design system `tokens.json`, `components/index.d.ts`, `components/bundle.css`, each component's `README.md`, `building-in-code.md`.

**Tokens and global styles**
- [ ] Script that generates `src/styles/tokens.css` from `tokens.json` (light on `:root`, dark in `prefers-color-scheme: dark`, `--money: var(--ink)`); an npm script to rerun it
- [ ] `src/styles/globals.css`: body, `--font-sans`, tabular numbers, focus ring, type-style classes (large-title, title, section, body, body-strong, meta, label, caption, overline, amount, big-number)
- [ ] Noto Sans 400/600/700 via `next/font`, latin + latin-ext
- [ ] Inputs at 16px or more (no iPhone zoom); safe-area padding helpers

**Components** — one folder each in `src/components/` (`Name.tsx`, `Name.module.css`, `index.ts`), props exactly as in `index.d.ts`, ported from the `ba-` blocks in `bundle.css`

- [ ] **Navigation:** TopBar, TabBar, FAB, ActionBar, StepIndicator
- [ ] **Buttons and controls:** Button, IconButton, Chip, SegmentedControl, Switch, ChoiceGrid, RadioList, CheckRow
- [ ] **Fields:** TextField, AmountField, SelectField, SearchField
- [ ] **Containers:** Card, ListGroup, CollapsibleSection, BottomSheet, ActionSheet, ConfirmDialog
- [ ] **Recipe and ingredient:** RecipeCard, IngredientCard, IngredientRow, EditLineRow, CostLine, ScaleBar, StatTile
- [ ] **Feedback and status:** Tag, Notice, WarningBanner, Toast, SyncStatus, Skeleton, EmptyState, StepList

Rules: `href` → `next/link`, `onClick` → `<button>`, never both. Icon-only buttons require `label`. Native `<dialog>` with `showModal()`, `<select>`, `<input type="checkbox">`. No inline styles, no hex values. Components only display pre-formatted text.

**Dev page**
- [ ] `/dev/components` showing every component in each of its states (not linked from the app)

**Done when:** every component matches its design-system preview in light and dark, and axe passes on `/dev/components`.

**Notes**

---

## M4 — Calculation engine

**Goal:** all the maths as pure, fully tested TypeScript, before any screen uses it.

**PRD:** §4, §9, F3, F5, F6, F7.

**`src/lib/units.ts`**
- [ ] Unit list and kinds: weight (g, kg, oz, lb), volume (ml, l, fl oz, tsp, tbsp, cup US), count (pcs)
- [ ] Convert within a kind with the §4 factors; refuse across kinds

**`src/lib/calc/`**
- [ ] Ingredient cost per unit = pack price ÷ pack size converted to the measuring unit; missing if price or size is empty or the ingredient is deleted; ₦0 is a real price
- [ ] Ingredient line cost = amount × cost per unit
- [ ] Sub-recipe line cost = amount × (sub-recipe ingredient cost ÷ its yield in g or pcs); missing if the sub-recipe is deleted or has any missing line; ingredients only (no overhead or markup carried in)
- [ ] Recipe ingredient total (every line, including sub-recipe lines) and an incomplete flag with a count of missing lines
- [ ] Overhead total; deleted overhead items still count; per-calculation overrides
- [ ] Total cost; cost per piece and per gram where the yield allows
- [ ] Multiplier from weight, from count, or typed; which fields the yield supports
- [ ] Scaling: ingredient and sub-recipe amounts and set price scale; overhead and fixed profit don't
- [ ] Pricing: markup, margin (must be under 100%), fixed profit, set price, none; profit, margin and markup always derived
- [ ] Loop detection for sub-recipes (direct and indirect)
- [ ] Unit change on an ingredient converts its recipe line amounts so costs don't change
- [ ] Sub-recipe yield check (gram amount needs a weight yield; pieces need a count yield)

**`src/lib/format.ts`**
- [ ] Money in the business currency, whole units, from minor units
- [ ] Cost per unit (2 decimals), amounts (≥10 whole with separator; <10 up to 2 decimals), pieces (up to 2), multiplier (up to 3), a space before units
- [ ] Missing price never formats as ₦0

**Tests**
- [ ] Every §9 fixture: Vanilla Cake ×1, at 800 g, with Labour edited to ₦2,000; the four pricing methods at ₦10,000; ₦15,000 / 12.5 kg → ₦1.20 per g; ₦1,000 / 50 pcs and 12 bags ×3; ₦0 vs empty
- [ ] Full coverage of `src/lib/` (conversions, missing vs zero, sub-recipes, loops, pricing)

**Done when:** all §9 fixtures pass, with full coverage of conversions, missing vs zero, sub-recipes, loops and pricing.

**Notes**

---

## M5 — Getting started

**Goal:** a new user goes from first open to an empty Recipes screen with her business set up.

**PRD:** F1, F9. **Screens:** Welcome, SignUp, LogIn, ForgotPassword, Setup, InstallGuide, EmptyRecipes, TabBar.

**Auth**
- [ ] *Welcome*: Sign up / Log in
- [ ] *SignUp*: name, email, password (8+ characters, show/hide); name saved as `display_name` in auth metadata
- [ ] *LogIn*: email + password; link to Forgot password
- [ ] *ForgotPassword*: sends the reset email (needs internet)
- [ ] "Set a new password" page opened from the email link, in the browser *(no mockup: see Open questions)*
- [ ] Stays logged in offline; first sign-in needs internet (clear message when offline)
- [ ] Forms with React Hook Form + Zod

**Setup**
- [ ] *Setup*: business name, currency (list, likely one first), default pricing method + value (Markup 50% preselected)
- [ ] Calls `create_business` (online only); PowerSync connects afterwards

**Shell**
- [ ] Route guard: signed out → Welcome; signed in without a business → Setup; otherwise Recipes
- [ ] *TabBar*: Recipes · Ingredients · Settings (Settings can be a stub until M9)
- [ ] *InstallGuide* sheet offered once after setup (remember it was shown)
- [ ] *EmptyRecipes*: main button is "Add ingredients"

**Done when:** a new user reaches the empty Recipes screen with five overhead items.

**Notes**

---

## M6 — Ingredients

**Goal:** she can manage her full ingredient list, offline.

**PRD:** F3, §4. **Screens:** Ingredients, IngredientsDark, IngredientSheet, DeleteIngredient, EmptyIngredients.

- [ ] *Ingredients*: list with search by name, "add price" on missing prices, FAB to add
- [ ] *EmptyIngredients*: "Add your first ingredient"
- [ ] *IngredientSheet* (add and edit): name, unit, pack price, pack size, pack size unit, notes; "Works out to ₦1.20 per g"; "Price last updated"
- [ ] Validation in the app: name unique among non-deleted ingredients ignoring capitals; pack size unit must be the same kind as the unit
- [ ] Empty price = missing; ₦0 saves as a real price
- [ ] `price_updated_at` set when price, size or size unit changes
- [ ] Changing the unit within the same kind converts every recipe line for that ingredient in the same transaction (uses M4)
- [ ] *DeleteIngredient*: soft delete; when in use, warns with the recipe list ("Flour is in 14 recipes")
- [ ] Money entered in whole currency units and stored in minor units
- [ ] Works offline; matches mockups in light and dark

**Done when:** Flour at ₦15,000 / 12.5 kg shows "₦1.20 / g", and missing and ₦0 behave differently.

**Notes**

---

## M7 — Recipes

**Goal:** the recipe list and the recipe screen, which is the calculator.

**PRD:** F4 (chips), F5 (view, edit, delete), F6, F7. **Screens:** Main, RecipesDark, Recipe, RecipeDark, RecipeCosts, RecipeSub, CookieRecipe, RecipeMenu, EditRecipe, DiscardChanges, DeleteRecipe, DeleteRecipeInUse.

**Recipes list**
- [ ] *Main*: RecipeCards, search, category chips (All, her categories in order, Uncategorised if any recipe has none), incomplete tag on cards, FAB

**Recipe screen**
- [ ] Title block: name, category tag, base yield
- [ ] ScaleBar: × multiplier, grams and pieces linked; unsupported field hidden with its note ("Add the dough weight to scale by grams")
- [ ] "Scaled ×0.533" + Reset; "Show the maths" toggle ("800 g ÷ 1,500 g = ×0.533")
- [ ] Ingredients tab: one card per section, scaled amounts and line costs; deleted ingredient lines show "Flour was deleted"
- [ ] *RecipeSub*: sub-recipe lines open inline with their scaled ingredients
- [ ] *CookieRecipe*: count-yield recipe, per-piece supplies scale
- [ ] *RecipeCosts*: ingredient total, overhead lines, total cost, per piece / per gram, price with method, profit, margin
- [ ] Overhead editable for this calculation only: "edited" tag + reset; deleted items show "(deleted)" and still count
- [ ] Set price and fixed profit editable in the calculator
- [ ] WarningBanner and greyed totals when incomplete ("Incomplete: 1 ingredient has no price")
- [ ] StatTile grid
- [ ] Nothing saved; leaving returns to ×1
- [ ] Wake Lock while the recipe is open

**Menu, edit, delete**
- [ ] *RecipeMenu*: Edit recipe · Change category · Delete recipe
- [ ] *EditRecipe*: one page, collapsible Basics / Ingredients / Overhead & price; sections and lines reorderable; same validation as M8
- [ ] *DiscardChanges* on close with unsaved changes
- [ ] *DeleteRecipe*: confirm, soft delete
- [ ] *DeleteRecipeInUse*: lists recipes that use it; their lines then show "Salted Caramel was deleted" and totals go incomplete

**Done when:** the Vanilla Cake fixtures show on screen, and editing overhead doesn't change the saved recipe.

**Notes**

---

## M8 — New recipe flow

**Goal:** she can create a full recipe offline in three steps.

**PRD:** F4 (picker), F5 (create), F7. **Screens:** NewRecipe1, NewRecipe2, NewRecipe3, CategoryPicker, AddIngredients, RecipeSaved.

- [ ] *NewRecipe1* (Basics): name, category, notes, yield type + amount, optional second figure; weight in any unit, stored in grams
- [ ] *CategoryPicker*: pick one or add a new one on the spot
- [ ] *NewRecipe2* (Ingredients): sections (one to start, name hidden while alone), ingredient and sub-recipe lines, reorder, running ingredient cost
- [ ] *AddIngredients*: searchable sheet with checkboxes, then fill in amounts
- [ ] Sub-recipe lines: amount in the sub-recipe's yield unit; blocked when the needed yield is missing; loop check before saving
- [ ] *NewRecipe3* (Overhead & price): pick overhead items with amounts; pricing method + value (business default; empty = cost only); margin under 100%
- [ ] Back / Next with the running total in the ActionBar; Discard dialog on close
- [ ] Save writes the recipe, sections and lines in one local transaction
- [ ] *RecipeSaved*: opens the recipe at ×1 with the "saved" toast

**Done when:** a recipe made offline syncs and matches when reopened.

**Notes**

---

## M9 — Settings and sync

**Goal:** everything around the recipes: settings, lists, sync status and signing out.

**PRD:** F1, F2, F4, F8, F9. **Screens:** Settings, SettingsDark, OverheadItems, Categories, SyncSheet, SignOut, Loading.

**Settings**
- [ ] *Settings*: Business (name, currency, default pricing) · Recipes (overhead items, categories) · App (install on iPhone) · Account (email, change password, sign out)
- [ ] Changing currency changes display only; amounts never convert
- [ ] Change password *(no mockup: see Open questions)*

**Lists**
- [ ] *OverheadItems*: add, rename, delete, recipe count per row; delete-in-use warns with the recipe list; lines stay as "(deleted)" and still count
- [ ] *Categories*: create, rename, reorder, delete; deleting moves its recipes to Uncategorised (cleared locally in the same transaction)

**Sync**
- [ ] SyncStatus pill on tab screens: "All synced" (fades), "3 changes waiting" (opens the sheet), "Offline" (neutral)
- [ ] *SyncSheet*: waiting changes (what and when), last sync time
- [ ] A dropped (rejected) change is explained to her in plain words
- [ ] *SignOut*: simple confirm when nothing waits; warning with "Stay signed in" / "Sign out anyway" when changes wait; clears the local copy

**States**
- [ ] *Loading*: skeleton cards, only before the first sync
- [ ] Dark mode pass on every screen

**Done when:** the sign-out warning appears with changes waiting, and every screen has been checked in dark mode.

**Notes**

---

## M10 — Load her spreadsheet

**Goal:** her account opens with her ingredients and finished cakes in place.

**PRD:** §7. Run by Keside; not an app feature.

- [ ] Her account and business created through the app
- [ ] One-off script (outside the app bundle) using `SUPABASE_SECRET_KEY`
- [ ] Ingredients tab (47 items) → ingredients
- [ ] Each finished cake tab with a yield → a recipe; section headers → sections; "Yields-1500g" → weight yield; instructions → notes
- [ ] Indirect + Miscellaneous rows → overhead items + overhead lines (one list)
- [ ] Markup % → markup; Cocachio "Profit ₦2,000" → fixed profit
- [ ] Skip: cookies, unfinished tabs, sub-recipe links, recipes without yields
- [ ] Check report: every loaded recipe at ×1 against its tab's total cost and price

**Done when:** every loaded recipe matches its tab at ×1.

**Notes**

---

## M11 — Hardening

**Goal:** ready for real use on her phone.

**PRD:** §5 hosting, F6, F8, F9, §11.

- [x] Sentry SDK: client, server and edge errors, global error page (done early, in M0)
- [x] Permanently rejected uploads reported to Sentry
- [ ] Source maps upload on Vercel builds (`SENTRY_AUTH_TOKEN` in Vercel); production stack traces readable
- [ ] Daily keep-alive (Vercel cron or GitHub Action) for Supabase and PowerSync
- [ ] Playwright flows: sign up → setup → ingredient → recipe → scale
- [ ] Playwright offline tests: add and edit offline, then sync
- [ ] Screenshot comparison with every mockup at 390 × 844, light and dark
- [ ] axe on every screen
- [ ] Real-iPhone pass: ₦, tabular numbers, keyboard (ActionBar and sheets above it), safe areas, Wake Lock, install guide

**Done when:** no failing checks, and ₦ renders on her phone.

**Notes**

---

## M12 — Pilot

**Goal:** she uses it for real for 1–2 weeks.

- [ ] Her account loaded (M10) and app installed on her phone
- [ ] Testers invited (empty accounts with starter overhead items)
- [ ] Issues logged in this section as they come in, and fixed

**Done when:** issues are logged and fixed.

**Notes**

---

## Coverage

**Features → milestones**

| Feature | Milestones |
|---|---|
| F1 Account and business | M2 (`create_business`), M5, M9 (settings) |
| F2 Overhead items | M2 (starter items), M4 (maths), M7 (edit in calculator), M8 (pick), M9 (manage) |
| F3 Ingredients | M4 (maths), M6 |
| F4 Categories | M7 (chips), M8 (picker), M9 (manage) |
| F5 Recipes | M4 (maths), M7 (view, edit, delete), M8 (create) |
| F6 Scaling calculator | M4 (maths), M7 |
| F7 Pricing methods | M4 (maths), M5 (default), M7, M8 |
| F8 Offline and sync | M1, M2, M9, M11 |
| F9 App shell and install | M1 (PWA), M3, M5, M9, M11 |

**Screens → milestones** (all 39 mockups)

| Milestone | Screens |
|---|---|
| M5 | Welcome, SignUp, LogIn, ForgotPassword, Setup, InstallGuide, EmptyRecipes, TabBar |
| M6 | Ingredients, IngredientsDark, IngredientSheet, DeleteIngredient, EmptyIngredients |
| M7 | Main, RecipesDark, Recipe, RecipeDark, RecipeCosts, RecipeSub, CookieRecipe, RecipeMenu, EditRecipe, DiscardChanges, DeleteRecipe, DeleteRecipeInUse |
| M8 | NewRecipe1, NewRecipe2, NewRecipe3, CategoryPicker, AddIngredients, RecipeSaved |
| M9 | Settings, SettingsDark, OverheadItems, Categories, SyncSheet, SignOut, Loading |

---

## Open questions

Raise each before the milestone that needs it. Answers go into the PRD.

| # | Question | Needed by |
|---|---|---|
| 1 | ~~M1 spike RLS: tie rows to the logged-in user until M2 brings in businesses?~~ Yes (19 Oct) | M1 |
| 2 | ~~Add the Supabase CLI for migrations (`supabase/migrations/`)?~~ Yes, added in M1 (19 Oct) | M2 |
| 3 | The "set a new password" page has no mockup. Build it from the sign-in screen pattern? | M5 |
| 4 | Which currencies go in the Setup list, and how is "the likely one first" chosen? | M5 |
| 5 | Money is stored in minor units (kobo). For a currency with no minor unit (e.g. JPY), do we still store ×100? | M5 |
| 6 | "Change password" in Settings has no mockup. Sheet, or its own screen? | M9 |
