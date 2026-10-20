# Butterlogs — Build Plan

The detailed version of PRD section 8. The PRD says **what** to build; this file breaks each milestone into tasks and records **where we are**.

- Work one milestone at a time. Don't start the next until Keside says go.
- Tick tasks as they're done. When a milestone finishes, set its status, add the date, and write 2–3 lines in its **Notes**.
- If a task here and the PRD disagree, the PRD wins. Fix this file.
- Screens are named by their mockup file (`Recipe.dc.html` → *Recipe*). Components are named as in the design system.
- From M3 on, each milestone is a vertical slice: components, maths and screens for one part of the app, checked on Keside's iPhone (see "How each milestone from M3 on is built").

## Status

| # | Milestone | Features | Status | Finished |
|---|---|---|---|---|
| M0 | Accounts and project setup | — | Done | 19 Oct 2026 |
| M1 | Offline spike on an iPhone | F8 (proof) | Done | 19 Oct 2026 |
| M2 | Full data model | All (data) | Done | 19 Oct 2026 |
| M3 | Foundation and getting started | F1, F7, F9 | Done | 20 Oct 2026 |
| M4 | Ingredients | F3 | Not started | |
| M5 | Create recipes | F2, F4, F5, F7 | Not started | |
| M6 | Recipe screen (the calculator) | F5, F6, F7 | Not started | |
| M7 | Change and delete recipes | F4, F5 | Not started | |
| M8 | Settings and sync | F1, F2, F4, F8, F9 | Not started | |
| M9 | Load her spreadsheet | — | Not started | |
| M10 | Hardening | F6, F8, F9 | Not started | |
| M11 | Pilot | — | Not started | |

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
- 19 Oct 2026: Supabase, PowerSync and Sentry connected. Sentry's wizard also set up the SDK (pulled forward from Hardening, now M10); Session Replay removed, DSN read from `NEXT_PUBLIC_SENTRY_DSN`.

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
- [x] ₦ and tabular figures render on the iPhone: not confirmed in M1; confirmed in M3 on Keside's iPhone (20 Oct)

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

**Migrations** (`supabase/migrations/20261019120000_m2_data_model.sql`)
- [x] Drop the M1 spike table
- [x] Ten tables from §6 with the exact column types (money `bigint`, amounts `double precision`, ordering `position double precision`)
- [x] `created_at` / `updated_at` on every table; `set_updated_at` trigger on every table (price history is insert-only: `recorded_at` instead)
- [x] Composite unique `(business_id, id)` on every parent table, and composite foreign keys from every child
- [x] `recipes.category_id` → `ON DELETE SET NULL`
- [x] Server checks that can never fail on valid app data: exactly one of `ingredient_id` / `sub_recipe_id`; `amount > 0`; `amount_minor >= 0`; `yield_type` and `pricing_method` values; `business_members` unique `(business_id, user_id)`
- [x] Soft delete `deleted_at` on `ingredients`, `overhead_items`, `recipes`

**Functions and triggers**
- [x] `is_member(business_id)`: security definer, stable
- [x] `create_business(name, currency, method, percent, amount)`: one transaction; business + owner row + five starter overhead items (Gas, Electricity, Transport, Labour, Packaging); refuses a second business
- [x] `record_price_history`: after insert/update on `ingredients` when price, size or size unit changes

**Row Level Security**
- [x] Business data tables: select / insert / update / delete when `is_member(business_id)`, using and with check
- [x] `businesses`: select and update for members; no insert or delete
- [x] `business_members`: select own rows only; writes only through `create_business`
- [x] `ingredient_price_history`: no app access

**PowerSync**
- [x] Publication lists every synced table (all except price history). M0 created it `FOR ALL TABLES`: drop and recreate it with the explicit list
- [x] Sync stream from §6, with the `with:` block for the user's businesses (check syntax against PowerSync's "Writing queries" docs)
- [x] Full client schema in `src/lib/db/` (uuid/text/timestamptz → text, bigint → integer, double → real)
- [x] Upload connector: temporary errors retry; permanent errors (rejected data, RLS) drop the change. Takes a Supabase client so tests can use each test user's. Sentry reporting is wired in M10; the message to her is in M8

**Tests**
- [x] RLS test with two businesses: each sees and changes only its own rows, directly and through PowerSync
- [x] Composite keys block a reference to another business's row
- [x] A price change writes one history row; a notes change writes none
- [x] `create_business` creates five overhead items and refuses a second call
- [x] Tests live in `tests/db/` and run with `npm run test:db` against the live project, with throwaway users (removed before and after each run)
- [x] M1 spike page removed; home is a signed-in placeholder until M3

**Done when:** the two-business RLS test passes, directly and through PowerSync, and a price change writes a history row.

**Notes**
- 19 Oct 2026: migration, sync config, client schema and tests written; typecheck and lint pass. `@powersync/node` pinned to 1.1.1 so it shares `@powersync/common` 2.3.1 with `@powersync/web`. Waiting on Keside to apply the migration (`npx supabase db push` asks for the database password) and deploy the sync config.
- 19 Oct 2026: done. Migration applied and sync config deployed; `npm run test:db` passes (54 tests: RLS on every table, composite keys, checks, `create_business`, price history, and two phones through PowerSync, including a rejected cross-business upload being dropped). Test users are removed before and after each run. Next: M3, foundation and getting started.

---

## How each milestone from M3 on is built

Each milestone is a **vertical slice**: one part of the app, built all the way through and checked on a real phone. Nothing is built ahead of the screen that needs it.

Every slice includes:
- **Components** its screens use first: ported from the `ba-` blocks in `bundle.css`, with props exactly as in `index.d.ts`, and added to `/dev/components` with their states. The list under each milestone is a starting point; it's confirmed against the mockups in plan mode before the milestone starts.
- **Maths** its screens need, in `src/lib/calc`, `units.ts` or `format.ts`, as pure functions with Vitest tests, including any PRD §9 fixtures it covers. Full coverage of `src/lib/` throughout.
- **Screens**, matched to their mockups at 390 × 844 in light and dark.
- **Checks**: typecheck, lint, tests; a Playwright run of the slice's flow with axe; works offline; deployed to Vercel and checked on Keside's iPhone.

Component rules (all slices): `href` → `next/link`, `onClick` → `<button>`, never both. Icon-only buttons require `label`. Native `<dialog>` with `showModal()`, `<select>`, `<input type="checkbox">`. No inline styles, no hex values. Components only display pre-formatted text.

---

## M3 — Foundation and getting started

**Goal:** the design system's foundation in code, and a new user going from first open to an empty Recipes screen with her business set up, on a real phone.

**PRD:** F1, F7 (default), F9, §4 (money format). **Screens:** Welcome, Setup, InstallGuide, EmptyRecipes, TabBar, and the email and code screens built from the sign-in pattern (SignUp and LogIn were drawn for passwords; ForgotPassword is not built).

**Foundation** (sources: design system `tokens.json`, `components/index.d.ts`, `components/bundle.css`, `building-in-code.md`)
- [x] `scripts/tokens.mjs` generates `src/styles/tokens.css` from `design/tokens.json` (a copy of the design system's); light on `:root`, dark in `prefers-color-scheme: dark`, `--money: var(--ink)`; rerun with `npm run tokens`
- [x] `src/styles/globals.css`: body, `--font-sans`, tabular numbers, focus ring, `--screen-top` and safe-area helpers. Type styles are font variables in `tokens.css` (`font: var(--type-title)`) rather than classes, so CSS modules don't rely on `composes` from global classes under Turbopack
- [x] Noto Sans 400/600/700 via `next/font`, latin + latin-ext
- [x] Inputs at 16px or more (no iPhone zoom); safe-area padding
- [x] `/dev/components` page (not linked from the app); grows with every slice
- [x] Playwright + axe for slice flows at 390 × 844, light and dark (WebKit), against a production build on port 3100, two browsers at a time

**Components** (first needed here): TopBar, TabBar, Button, IconButton, TextField, SelectField, ChoiceGrid, BottomSheet, StepList, EmptyState, Notice, SyncStatus (pill only: "All synced", "Offline", "N changes waiting"; the sheet is M8). AmountField and Card moved to M4: no M3 screen needs them.
- [x] All 12 built, with every variant, and on `/dev/components`. TextField also takes `onBlur` (not in `index.d.ts`) so forms validate on blur, as its README asks
- [x] **CodeField** (new, not in the design system yet): six boxes for the sign-in code, one real input underneath so iPhone can fill the code from Mail. To be added to the design system artifact

**Maths**
- [x] `format.ts`: money in the business currency, whole units, from minor units (`formatMoney`)
- [x] `calc/pricing.ts`: markup, margin (must be under 100%), fixed profit, set price, none; profit, margin and markup always derived. §9 fixture: the four pricing methods at ₦10,000
- [x] Also: `parse.ts` (numbers typed as "1,700"), `currency.ts` (the four currencies, likely one from the phone's time zone), `auth-messages.ts`, `pending-sign-in.ts`; 100% coverage of the pure modules

**Accounts (Keside)**
- [x] Custom SMTP for Supabase Auth: Resend, on Keside's domain; emails-per-hour limit raised
- [x] Supabase email templates (Magic Link, Confirm signup) send the 6-digit code (`{{ .Token }}`), not a link; email code length set to 6

**Auth** (one-time email code, PRD F1)
- [x] *Welcome*: title and bold tagline only (the example card waits for Keside's design); Get started / I already have an account
- [x] Sign up: name + email → code; name saved as `display_name` in auth metadata
- [x] Log in: email → code; an email with no account says so
- [x] Code screen: six boxes (CodeField), checked as soon as the last digit is in; the email in the subtitle with "Change" (back with it filled in); "Didn’t get it? Resend code" after 60 seconds; plain-words errors for a wrong or expired code
- [x] Stays logged in offline, even after the hour-long access token expires (the stored login is trusted; supabase-js refreshes in the background); signing in needs internet
- [x] Forms with React Hook Form + Zod
- [x] Spike log-in page and placeholder home removed

**Setup**
- [x] *Setup*: business name, currency (Naira, US Dollar, British Pound, Euro; the phone's region picks the first, otherwise Naira), default pricing method (Markup 50% preselected); a % and live example price for Markup and Margin only, no amount for Fixed profit or Set price
- [x] Calls `create_business` (online only). PowerSync runs whenever she's signed in; Setup waits for her new business to sync, then opens Recipes

**Shell**
- [x] Route guard: signed out → Welcome; waiting for a code → the code screen; signed in without a business → Setup; otherwise Recipes
- [x] *TabBar*: Recipes · Ingredients · Settings. Ingredients is a stub until M4; Settings is a stub with "Install on iPhone" and a plain "Sign out" until M8
- [x] *InstallGuide* sheet offered once, right after setup, unless the app is already open from the home screen
- [x] *EmptyRecipes*: main button is "Add ingredients" ("Start a recipe anyway" comes with the flow in M5)
- [x] Service worker: every app page precached; Supabase, PowerSync and Sentry requests bypass it; PowerSync's worker scripts are served without their cached address (otherwise WebKit lost Turbopack's settings and the app showed a blank screen on every reopen)

**Check**
- [x] On Keside's iPhone: sign up with a real email code, Setup, Recipes; ₦ and tabular figures; airplane mode and reopen

**Done when:** on Keside's iPhone, a new user signs up with an email code, sets up her business and reaches the empty Recipes screen, with five overhead items in the database; ₦ and tabular figures render.

**Notes**
- 19 Oct 2026: built and passing typecheck, lint, unit tests (100% of the pure modules) and the Playwright flows in light and dark. The flows found three real problems, all fixed: the Supabase project sent 8-digit codes (set to 6); the app showed a blank screen on every reopen in WebKit (service worker vs Turbopack's worker settings); and opening offline after an hour waited up to 30 s on a token refresh. Decided along the way: no default amount for Fixed profit or Set price at setup, and a six-box code screen. Waiting on the iPhone check.
- 20 Oct 2026: done. On Keside's iPhone: sign up with a real code from Resend, Setup, empty Recipes, ₦ and tabular figures, and reopening in airplane mode all work. Known: a short blank screen while the local database opens on each launch (grey placeholders are planned for M8; could be brought forward). Next: M4, ingredients.

---

## M4 — Ingredients

**Goal:** she can manage her full ingredient list, offline.

**PRD:** F3, §4. **Screens:** Ingredients, IngredientsDark, IngredientSheet, DeleteIngredient, EmptyIngredients.

**Components** (first needed here): SearchField, FAB, IngredientCard, ConfirmDialog, AmountField, Card

**Maths**
- [ ] `units.ts`: unit list and kinds: weight (g, kg, oz, lb), volume (ml, l, fl oz, tsp, tbsp, cup US), count (pcs); convert within a kind with the §4 factors; refuse across kinds
- [ ] Ingredient cost per unit = pack price ÷ pack size converted to the measuring unit; missing if price or size is empty or the ingredient is deleted; ₦0 is a real price
- [ ] Unit change on an ingredient converts its recipe line amounts so costs don't change
- [ ] `format.ts`: cost per unit (2 decimals), amounts (≥10 whole with separator; <10 up to 2 decimals), pieces (up to 2), a space before units; missing price never formats as ₦0
- [ ] §9 fixtures: ₦15,000 / 12.5 kg → ₦1.20 per g; ₦1,000 / 50 pcs; ₦0 vs empty

**Screens**
- [ ] *Ingredients*: list with search by name, "add price" on missing prices, FAB to add
- [ ] *EmptyIngredients*: "Add your first ingredient"
- [ ] *IngredientSheet* (add and edit): name, unit, pack price, pack size, pack size unit, notes; "Works out to ₦1.20 per g"; "Price last updated"
- [ ] Validation in the app: name unique among non-deleted ingredients ignoring capitals; pack size unit must be the same kind as the unit
- [ ] Empty price = missing; ₦0 saves as a real price
- [ ] `price_updated_at` set when price, size or size unit changes
- [ ] Changing the unit within the same kind converts every recipe line for that ingredient in the same transaction (tested now; seen on screen from M5)
- [ ] *DeleteIngredient*: soft delete; when in use, warns with the recipe list ("Flour is in 14 recipes")
- [ ] Money entered in whole currency units and stored in minor units

**Done when:** on Keside's iPhone, offline, Flour at ₦15,000 / 12.5 kg shows "₦1.20 / g", and missing and ₦0 behave differently.

**Notes**

---

## M5 — Create recipes

**Goal:** she can create a full recipe offline in three steps and see it on the Recipes list with the right cost.

**PRD:** F4 (chips, picker), F5 (create), F7. **Screens:** NewRecipe1, NewRecipe2, NewRecipe3, CategoryPicker, AddIngredients, Main, RecipesDark.

**Components** (first needed here): StepIndicator, ActionBar, SegmentedControl, EditLineRow, CheckRow, RadioList, RecipeCard, Chip, Tag, Toast

**Maths**
- [ ] Ingredient line cost = amount × cost per unit
- [ ] Sub-recipe line cost = amount × (sub-recipe ingredient cost ÷ its yield in g or pcs); missing if the sub-recipe is deleted or has any missing line; ingredients only (no overhead or markup carried in)
- [ ] Recipe ingredient total (every line, including sub-recipe lines) and an incomplete flag with a count of missing lines
- [ ] Overhead total; deleted overhead items still count
- [ ] Total cost; cost per piece and per gram where the yield allows
- [ ] Loop detection for sub-recipes (direct and indirect)
- [ ] Sub-recipe yield check (gram amount needs a weight yield; pieces need a count yield)
- [ ] §9 fixture: Vanilla Cake ×1

**New recipe flow**
- [ ] *NewRecipe1* (Basics): name, category, notes, yield type + amount, optional second figure; weight in any unit, stored in grams
- [ ] *CategoryPicker*: pick one or add a new one on the spot
- [ ] *NewRecipe2* (Ingredients): sections (one to start, name hidden while alone), ingredient and sub-recipe lines, reorder, running ingredient cost
- [ ] *AddIngredients*: searchable sheet with checkboxes, then fill in amounts
- [ ] Sub-recipe lines: amount in the sub-recipe's yield unit; blocked when the needed yield is missing; loop check before saving
- [ ] *NewRecipe3* (Overhead & price): pick overhead items with amounts; pricing method + value (business default; a Fixed profit or Set price default starts with the amount empty; empty method = cost only); margin under 100%
- [ ] Back / Next with the running total in the ActionBar; Discard dialog on close
- [ ] Save writes the recipe, sections and lines in one local transaction
- [ ] After saving: back to Recipes with the "saved" Toast (M6 switches this to opening the recipe, as in *RecipeSaved*)

**Recipes list**
- [ ] *Main*: RecipeCards (yield, total, per g or per piece), search, category chips (All, her categories in order, Uncategorised if any recipe has none), incomplete tag on cards, FAB
- [ ] *EmptyRecipes* "Start a recipe anyway" opens the flow

**Done when:** on Keside's iPhone, Vanilla Cake made offline shows ₦10,287 on its card, syncs, and shows the same after a reload.

**Notes**

---

## M6 — Recipe screen (the calculator)

**Goal:** opening a recipe shows its ingredients and costs, and scales them.

**PRD:** F5 (view), F6, F7. **Screens:** Recipe, RecipeDark, RecipeCosts, RecipeSub, CookieRecipe, RecipeSaved.

**Components** (first needed here): ScaleBar, Switch, IngredientRow, CostLine, StatTile, WarningBanner

**Maths**
- [ ] Multiplier from weight, from count, or typed; which fields the yield supports
- [ ] Scaling: ingredient and sub-recipe amounts and set price scale; overhead and fixed profit don't
- [ ] Per-calculation overhead overrides
- [ ] `format.ts`: multiplier (up to 3 decimals)
- [ ] §9 fixtures: Vanilla Cake at 800 g, and with Labour edited to ₦2,000; 12 bags ×3

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
- [ ] *RecipeSaved*: saving a new recipe opens it at ×1 with the "saved" toast; RecipeCards open the recipe

**Done when:** on Keside's iPhone, the Vanilla Cake fixtures show on screen (₦10,287 at ×1; ₦7,983 at 800 g, priced ₦11,975), and editing overhead doesn't change the saved recipe.

**Notes**

---

## M7 — Change and delete recipes

**Goal:** she can edit, recategorise and delete recipes safely.

**PRD:** F4 (change category), F5 (edit, delete). **Screens:** RecipeMenu, EditRecipe, DiscardChanges, DeleteRecipe, DeleteRecipeInUse.

**Components** (first needed here): ActionSheet, CollapsibleSection

- [ ] *RecipeMenu*: Edit recipe · Change category · Delete recipe
- [ ] *EditRecipe*: one page, collapsible Basics / Ingredients / Overhead & price; sections and lines reorderable; same validation as M5
- [ ] *DiscardChanges* on close with unsaved changes
- [ ] *DeleteRecipe*: confirm, soft delete
- [ ] *DeleteRecipeInUse*: lists recipes that use it; their lines then show "Salted Caramel was deleted" and totals go incomplete

**Done when:** on Keside's iPhone, an edit made offline syncs, and deleting a sub-recipe in use marks the recipes that use it incomplete.

**Notes**

---

## M8 — Settings and sync

**Goal:** everything around the recipes: settings, lists, sync details and signing out.

**PRD:** F1, F2, F4, F8, F9. **Screens:** Settings, SettingsDark, OverheadItems, Categories, SyncSheet, SignOut, Loading.

**Components** (first needed here): ListGroup, Skeleton

**Settings**
- [ ] *Settings*: Business (name, currency, default pricing) · Recipes (overhead items, categories) · App (install on iPhone) · Account (email, sign out; no change password, so the mockup's row is left out)
- [ ] Changing currency changes display only; amounts never convert

**Lists**
- [ ] *OverheadItems*: add, rename, delete, recipe count per row; delete-in-use warns with the recipe list; lines stay as "(deleted)" and still count
- [ ] *Categories*: create, rename, reorder, delete; deleting moves its recipes to Uncategorised (cleared locally in the same transaction)

**Sync**
- [ ] SyncStatus pill opens the sheet when changes wait; "All synced" fades
- [ ] *SyncSheet*: waiting changes (what and when), last sync time
- [ ] A dropped (rejected) change is explained to her in plain words
- [ ] *SignOut*: simple confirm when nothing waits; warning with "Stay signed in" / "Sign out anyway" when changes wait; clears the local copy

**States**
- [ ] *Loading*: skeleton cards, only before the first sync
- [ ] Dark mode pass on every screen

**Done when:** on Keside's iPhone, the sign-out warning appears with changes waiting, and every screen has been checked in dark mode.

**Notes**

---

## M9 — Load her spreadsheet

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

## M10 — Hardening

**Goal:** ready for real use on her phone.

**PRD:** §5 hosting, F6, F8, F9, §11.

- [x] Sentry SDK: client, server and edge errors, global error page (done early, in M0)
- [x] Permanently rejected uploads reported to Sentry
- [ ] Source maps upload on Vercel builds (`SENTRY_AUTH_TOKEN` in Vercel); production stack traces readable
- [ ] Daily keep-alive (Vercel cron or GitHub Action) for Supabase and PowerSync
- [ ] Playwright end-to-end: sign up → setup → ingredient → recipe → scale (joins the slice flows)
- [ ] Playwright offline tests: add and edit offline, then sync
- [ ] Screenshot comparison with every mockup at 390 × 844, light and dark
- [ ] axe on every screen
- [ ] Her-phone pass: ₦, tabular numbers, keyboard (ActionBar and sheets above it), safe areas, Wake Lock, install guide

**Done when:** no failing checks, and ₦ renders on her phone.

**Notes**

---

## M11 — Pilot

**Goal:** she uses it for real for 1–2 weeks.

- [ ] Her account loaded (M9) and app installed on her phone
- [ ] Testers invited (empty accounts with starter overhead items)
- [ ] Issues logged in this section as they come in, and fixed

**Done when:** issues are logged and fixed.

**Notes**

---

## Coverage

**Features → milestones**

| Feature | Milestones |
|---|---|
| F1 Account and business | M2 (`create_business`), M3, M8 (settings) |
| F2 Overhead items | M2 (starter items), M5 (pick, maths), M6 (edit in calculator), M8 (manage) |
| F3 Ingredients | M4 |
| F4 Categories | M5 (chips, picker), M7 (change), M8 (manage) |
| F5 Recipes | M5 (create), M6 (view), M7 (edit, delete) |
| F6 Scaling calculator | M6 |
| F7 Pricing methods | M3 (maths, default), M5, M6 |
| F8 Offline and sync | M1, M2, M3 (pill), every slice (works offline), M8, M10 |
| F9 App shell and install | M1 (PWA), M3, M8, M10 |

**Screens → milestones** (all 39 mockups)

| Milestone | Screens |
|---|---|
| M3 | Welcome, Setup, InstallGuide, EmptyRecipes, TabBar; email and code screens in place of SignUp and LogIn (ForgotPassword not built) |
| M4 | Ingredients, IngredientsDark, IngredientSheet, DeleteIngredient, EmptyIngredients |
| M5 | NewRecipe1, NewRecipe2, NewRecipe3, CategoryPicker, AddIngredients, Main, RecipesDark |
| M6 | Recipe, RecipeDark, RecipeCosts, RecipeSub, CookieRecipe, RecipeSaved |
| M7 | RecipeMenu, EditRecipe, DiscardChanges, DeleteRecipe, DeleteRecipeInUse |
| M8 | Settings, SettingsDark, OverheadItems, Categories, SyncSheet, SignOut, Loading |

**Components → milestones** (all 38)

| Milestone | Components |
|---|---|
| M3 | TopBar, TabBar, Button, IconButton, TextField, SelectField, ChoiceGrid, BottomSheet, StepList, EmptyState, Notice, SyncStatus; plus CodeField (not in the design system yet) |
| M4 | SearchField, FAB, IngredientCard, ConfirmDialog, AmountField, Card |
| M5 | StepIndicator, ActionBar, SegmentedControl, EditLineRow, CheckRow, RadioList, RecipeCard, Chip, Tag, Toast |
| M6 | ScaleBar, Switch, IngredientRow, CostLine, StatTile, WarningBanner |
| M7 | ActionSheet, CollapsibleSection |
| M8 | ListGroup, Skeleton |

---

## Open questions

Raise each before the milestone that needs it. Answers go into the PRD.

| # | Question | Needed by |
|---|---|---|
| 1 | ~~M1 spike RLS: tie rows to the logged-in user until M2 brings in businesses?~~ Yes (19 Oct) | M1 |
| 2 | ~~Add the Supabase CLI for migrations (`supabase/migrations/`)?~~ Yes, added in M1 (19 Oct) | M2 |
| 3 | ~~The "set a new password" page has no mockup.~~ No passwords: sign-in uses one-time email codes, screens built from the sign-in pattern (19 Oct) | M3 |
| 4 | ~~Which currencies go in the Setup list, and which first?~~ Naira, US Dollar, British Pound, Euro; the phone's region picks the first, otherwise Naira (19 Oct) | M3 |
| 5 | ~~For a currency with no minor unit, do we still store ×100?~~ Yes, always ×100 (19 Oct) | M3 |
| 6 | ~~"Change password" in Settings has no mockup.~~ Not needed: no passwords (19 Oct) | M8 |
