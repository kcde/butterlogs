# Butterlogs — Product Requirements Document

**Status:** Agreed, ready to build
**Date:** 16 October 2026
**Owner:** Keside
**Pilot user:** The Butter Puff Co.

---

## 0. How to use this document

This is the single source of truth for **what Butterlogs does, how its data works, and the order to build it**. How it **looks** lives in two Claude artifacts. Read them with the Artifact tool (sign in with `/login`; `/artifacts` lists them):

| Source | What it covers | Link |
|---|---|---|
| **This PRD** | Features, rules, calculations, data model, sync, build plan, tests | `docs/prd.md` |
| **Butterlogs design system** | Tokens, all 38 components with props (`components/index.d.ts`), screen patterns, the build guide (`building-in-code.md`) | https://claude.ai/artifact/7H2cKYXx1qJq2PuN1V6Wa2 |
| **Butterlogs mockups** | All 39 screens in rows by flow, plus a flow map. One file per screen (e.g. `Main.dc.html`) | https://claude.ai/artifact/JChFePQ5mcTiZAVG4XScWw |
| **Butter Puff Co. Costing Journal** (xlsx) | Her ingredients and recipes to load, and the numbers the maths must match | `docs/costing-journal.xlsx` |

**When sources disagree:**
- **Behaviour and data:** this PRD wins.
- **Visuals:** the design system wins.
- **Layout of a specific screen:** the mockup wins.
- If something is missing from all of them, ask instead of inventing it.

**Screens are named by their mockup file** (e.g. *Recipe.dc.html*) throughout.

---

## 1. Product

### What it is

A recipe scaling and costing app for home bakers and small bakeries. A baker saves each recipe once, with its ingredients, amounts and yield. After that, for any order, Butterlogs tells her:

1. **How much of each ingredient to use**, scaled to the size she needs (by multiplier, number of pieces, or target weight).
2. **What it costs her**: ingredients plus overhead, per batch, per piece and per gram.
3. **What to charge**, using her own pricing method. The app never suggests prices.

### Problems it solves

| Problem today | What Butterlogs does |
|---|---|
| Scaling to an odd size (1,200 g recipe → 800 g pan) means fraction maths | She types the target weight and every amount recalculates |
| Ingredient prices change and every recipe tab has to be checked | One ingredient list; change a price once, every recipe updates |
| Sub-recipes (caramel inside a cake) are copied by hand and drift out of sync | Recipes can include other saved recipes, linked |
| Blank price cells silently make totals too low | Missing prices are flagged and totals marked incomplete |
| Totals that skip rows | Totals always add every line |
| Packaging that should grow with quantity stays fixed | Per-piece supplies are ingredients and scale automatically |

### Users and launch

- **Users:** home bakers taking orders, and small bakeries.
- **MVP launch:** a pilot with The Butter Puff Co. plus a few testers.
- **No payments** in the MVP.
- **Her account** is pre-loaded with her ingredients and finished cake recipes (section 7). She adds cookies, unfinished recipes and sub-recipe links herself in the app.
- **Testers** start with an empty account that already has the starter overhead list.

### Platform

- **A web app built for phones**, installable as a PWA: home-screen icon, full screen, no browser bar.
- **Works fully offline**, including adding and editing. Changes sync when the phone is back online.
- **First sign-in needs internet.** After that, the app works without a connection.
- **The screen stays on** while a recipe is open.
- **An iPhone install guide** is offered once after setup and kept in Settings.

---

## 2. Feature summary

| # | Feature | Main screens |
|---|---|---|
| F1 | Account and business | Welcome, sign-in screens (email, code), Setup |
| F2 | Overhead items | OverheadItems, NewRecipe3, RecipeCosts |
| F3 | Ingredients and per-piece supplies | Ingredients, IngredientSheet, Restock (no mockup), DeleteIngredient, EmptyIngredients |
| F4 | Recipe categories | Categories, CategoryPicker, Main (chips) |
| F5 | Recipes: create, edit, delete | NewRecipe1–3, AddIngredients, EditRecipe, RecipeMenu, DeleteRecipe, DeleteRecipeInUse, DiscardChanges, RecipeSaved |
| F6 | Scaling calculator | Recipe, RecipeCosts, RecipeSub, CookieRecipe |
| F7 | Pricing methods | Setup, NewRecipe3, RecipeCosts |
| F8 | Offline and sync | SyncSheet, RecipesDark (offline pill), SignOut |
| F9 | App shell and install | TabBar, InstallGuide, Loading, empty states |

---

## 3. Features

### F1. Account and business

- **Sign up and log in with a one-time email code (needs internet).** No passwords, so there is no password reset or change.
  - She types her email; Supabase emails her a 6-digit code; she types it into the app. She never leaves the app.
  - Sign up asks for her name and email; the name is saved as `display_name` in Supabase Auth's user metadata. Log in asks for her email only.
  - "Resend code" after 60 seconds. A wrong or expired code says so in plain words.
  - No magic links: on iPhone they open in Safari, which keeps a separate login from the installed app. No Google sign-in in the MVP.
  - **Screens:** the SignUp, LogIn and ForgotPassword mockups were drawn for passwords. The email and code screens are built from the sign-in screen pattern in the design system (`screen-patterns.md`), using its components. ForgotPassword is not built.
  - **Email delivery:** Supabase sends the codes through Resend (custom SMTP, on Keside's domain). Its built-in sender allows only a few emails an hour, to team members only.
  - **Code screen:** six boxes, one per digit (a CodeField component, not yet in the design system), checked as soon as the last digit is in; the email shown with a "Change" link back to the previous screen.
- **A business is created at setup.** All data belongs to the business, not the person. The *Setup* screen asks for:
  - business name
  - currency: Nigerian Naira (₦), US Dollar ($), British Pound (£), Euro (€). The one matching the phone's region is first and preselected (Nigeria → Naira, US → Dollar, UK → Pound, eurozone → Euro); otherwise Naira.
  - default pricing method (Markup 50% preselected). Markup and Margin also take their default percentage, with a live example ("A cake that costs ₦10,000 to make sells for ₦15,000"). Fixed profit and Set price take no amount: a profit or price differs per product, so it's typed on each recipe.
- **Setup also creates five starter overhead items:** Gas, Electricity, Transport, Labour, Packaging.
- **One login per business** in the MVP. The data model allows staff logins later without a rebuild.
- **She stays logged in while offline.**

**Acceptance**
- A new user can sign up, name the business, pick a currency, and land on an empty Recipes screen with the starter overhead list in place.
- Changing the currency changes how every amount is displayed. Amounts are never converted.
- A user can never see or change another business's data.

### F2. Overhead items

- **What overhead is:** costs that stay the same per bake, whatever the batch size: gas, electricity, transport, labour, oven maintenance, and so on.
- **The list holds names only.** Each recipe picks the items it needs and sets its own amount for each (F5).
- **In the new-recipe flow** (agreed 27 Oct 2026), a recipe's overhead starts empty. "Add overhead item" opens a sheet with her items to tick (ones already on the recipe show ticked and greyed out) and a "New item" box that adds one to her list there and then. A new item stays in her list even if the recipe is discarded.
- **One overhead list per recipe.** Her sheet's "Indirect" and "Miscellaneous" groups are merged.
- **Overhead never scales on its own.** When scaling, overhead stays at the recipe's amounts unless she edits it in the calculator (F6).
- **Per-piece costs are not overhead.** Bags, liners and per-piece boxes are ingredients measured in pieces (F3).
- **She can add, rename and delete items** (*OverheadItems.dc.html*). Each row shows how many recipes use it.
- **Deleting an item that recipes use:**
  - The app warns first and lists the recipes.
  - Those recipes keep the line, labelled "Gas (deleted)", and it still counts in their totals.
  - She removes it recipe by recipe, so totals never change silently.

**Acceptance**
- Renaming an overhead item updates its name in every recipe that uses it.
- Deleting one in use shows the warning, and afterwards the recipes still count it, labelled "(deleted)".

### F3. Ingredients and per-piece supplies

One shared list of everything she buys. Every recipe reads its prices from here.

Adding an ingredient and saying what she paid for it are two steps (agreed 25 Oct 2026). The ingredient is only about the ingredient. Its price comes from **Restock**, which records what she last bought.

**The ingredient** (*IngredientSheet*: "New ingredient" or "Edit ingredient")

| Field | Example | Rules |
|---|---|---|
| Name | Flour | Unique among non-deleted ingredients, ignoring capitals (checked by the app) |
| I measure it in | g | g, kg, oz, lb, ml, l, fl oz, tsp, tbsp, cup, pcs: how her recipes count it |
| Notes | Bulk bag | Optional |

**Restock** (title "Restock — Flour")

| Field | Example | Stored as | Rules |
|---|---|---|---|
| Quantity bought | 12.5 | `pack_size` | Required, above 0 |
| Quantity bought unit | kg | `pack_size_unit` | Only units of the same kind as "I measure it in" are offered |
| Price paid | ₦15,000 | `pack_price_minor` | Required; ₦0 = genuinely free (water) |
| Price last updated | 2 weeks ago | `price_updated_at` | Set to now on every restock, even at the same price |

- **The flow:**
  - Saving a new ingredient opens Restock straight away. Closing it leaves the price missing ("add price").
  - Tapping an ingredient opens its sheet. It shows "Works out to", "Last bought 12.5 kg for ₦15,000, 2 weeks ago · Used in 14 recipes", and a **Restock** button. Unsaved edits are saved before Restock opens.
  - Restock starts with the last amount and unit (she usually buys the same bag), and Price paid is always empty. The first time, the amount is empty and the unit is the one she measures in.
  - Saving or closing Restock goes back to the list.
  - The ingredient sheet never changes the price.
- **No "pack" on screen:** not everything is bought in a pack. The columns keep their `pack_` names.
- **Cost per unit is calculated, never typed:** price paid ÷ quantity bought, converted into the measuring unit.
  - ₦15,000 for 12.5 kg, measured in g → ₦1.20 per g.
  - A full bag next time: ₦56,000 for 50 kg → ₦1.12 per g.
  - ₦1,000 for 50 bags → ₦20 a bag.
  - Restock and the ingredient sheet show the result as "Works out to ₦1.20 per g".
- **No conversion between kinds:** cups of flour ↔ grams is not supported.
- **Changing the measuring unit is allowed within the same kind.** Every recipe line for that ingredient is converted at the same time, so costs don't change. When editing, the sheet only offers units of the same kind.
- **Missing price** (never restocked):
  - The ingredient shows "add price".
  - Every recipe using it shows the line as missing, and its totals as incomplete.
- **Price history is kept automatically** on the server. It isn't shown in the MVP. It records changed values only, so a restock at the same price isn't a new history row.
- **Per-piece supplies** (ziplock bags, liners, a box per piece) are ingredients measured in pcs, so they scale with the recipe.
- **The list is A to Z by name** (agreed 25 Oct 2026). Each card shows the cost per unit and "12.5 kg · ₦15,000 · updated 2 weeks ago".
- **Search by name**, ignoring capitals and accents.
- **Deleting an ingredient no recipe uses:** the app asks first ("Delete Flour?", agreed 25 Oct 2026).
- **Deleting an ingredient that recipes use:**
  - The app warns and lists the recipes ("Flour is in 14 recipes").
  - If she goes ahead, those lines show "Flour was deleted" and count as missing, so totals are marked incomplete.

**Acceptance**
- Restocking at a new price updates the cost of every recipe that uses it.
- A quantity bought in a bigger unit of the same kind (kg for an ingredient measured in g) gives the right cost per unit.
- Restock only offers units of the same kind as "I measure it in".
- Deleting an ingredient in use warns with the recipe list first.

### F4. Recipe categories

- **She creates, renames, reorders and deletes categories** (*Categories.dc.html*).
- **One category per recipe.** None = **Uncategorised**.
- **The Recipes list filters by category chips:** All, then her categories in her order, then Uncategorised if any recipe has none.
- **The category picker** (*CategoryPicker.dc.html*) lets her pick one or add a new one on the spot. A new one goes at the end of her list and stays even if the recipe is discarded.
- **Deleting a category keeps its recipes.** They move to Uncategorised.
- Categories are for recipes only in the MVP.

### F5. Recipes

**Fields**

| Field | Required | Notes |
|---|---|---|
| Name | Yes | |
| Category | No | F4 |
| Notes | No | Free text ("L&Z yogurt or Dairy Day") |
| Yield | Yes | Type plus amount, below |
| Sections | At least one | |
| Ingredient and sub-recipe lines | | Inside sections |
| Overhead lines | No | F2 |
| Pricing method + value | No | Defaults to the business setting. Empty = cost only (fillings) |

**Yield**
- **Type is required:** weight (1,500 g of batter) or count (24 cookies).
- **An optional second figure:** a count recipe can also have a total weight ("24 cookies, 1,200 g dough"), and a weight recipe can also have a count.
- Weight is entered in any weight unit and stored in grams.

**Sections**
- A recipe is split into named sections, such as "Cake", "Crumble" and "Topping".
- A new recipe starts with one section. **The first section is never named**; every section she adds needs a name ("Name this section, like Crumble."). This is how her sheet works: Salted Caramel Cake has the cake part, then "Salted Caramel" (agreed 27 Oct 2026).
- Removing an added section with ingredients asks first ("Remove Crumble?" / "Its 3 ingredients will be removed too."); an empty one goes at once.
- The same ingredient can appear in more than one section.
- Lines reorder by dragging their grip within their section (or ↑/↓ on the grip). Moving whole sections comes with Edit recipe (M7).

**Ingredient lines**
- Pick an ingredient and enter the amount in that ingredient's unit.
- Add several at once: a searchable sheet with checkboxes (*AddIngredients.dc.html*), then fill in the amounts. Ingredients already in that section show ticked and greyed out.
- **An ingredient she doesn't have yet:** "New ingredient" at the bottom of the sheet opens the New ingredient sheet, then Restock (F3), and comes back to the sheet with it ticked (agreed 27 Oct 2026).
- Each line shows its cost on the recipe screen (M6). While she builds the recipe, the rows show no cost, as in *NewRecipe2*; the bar at the bottom shows the running ingredient cost, or "Ingredient cost · 1 has no price".
- Fractions of a piece are allowed (0.5 egg).

**Sub-recipe lines**
- **A line can be another saved recipe at a fixed amount**, in that recipe's yield unit: grams for a weight yield, pieces for a count.
- **It needs the matching yield.** A gram amount needs a weight yield on the sub-recipe.
- **Ingredients only.** The sub-recipe's overhead and markup are not carried in.
- **Always in the sub-recipe's own proportions.** For a one-off variation she adds the ingredients directly instead.
- **Changes carry through.** Edits to the sub-recipe update every recipe that uses it.
- **Opens inline on the recipe screen**, with its scaled ingredients (*RecipeSub.dc.html*).
- **No loops.** A recipe can't include itself, directly or through another recipe; the app checks before saving.
- **"Add a recipe"** opens the same sheet, listing her saved recipes with their ingredient cost per g or pc. An incomplete one is listed with the "incomplete" warning and can still be added; the line then counts as missing. Drafts are never listed.

**Overhead lines**
- Picked from the overhead list, each with an amount for the recipe at its base yield.

**Creating, editing and deleting**
- **New recipe is three steps:** Basics → Ingredients → Overhead & price, with Back/Next and a running ingredient cost. Saving opens the recipe at ×1 with a "saved" toast (until M6 builds the recipe screen, it goes back to Recipes with the toast).
- **A box she has to fill in** (a line amount, a section name, an overhead ₦, or a fixed profit or set price) stops Next or Save: every empty one gets a red outline, the cursor goes to the first, and the bar says "Fill in the boxes marked in red." Each outline goes as she types (agreed 27 Oct 2026).
- **Edit recipe is one page** with collapsible sections (Basics, Ingredients, Overhead & price). Closing with unsaved changes asks "Discard changes?".
- **The recipe "…" menu:** Edit recipe · Change category · Delete recipe.
- **Deleting a recipe** asks first.
- **Deleting a recipe used inside other recipes:**
  - The app warns and lists them.
  - If she goes ahead, those lines show "Salted Caramel was deleted" and the totals are marked incomplete.

**Drafts** (agreed 27 Oct 2026)
- A recipe she's building is kept as a draft on her phone as she types, so it survives switching apps, iOS closing the app, or a reload.
- Drafts live on this phone only: never synced, and cleared when she signs out.
- New recipe always starts blank, so she can have several drafts.
- **× while building:** if nothing was entered it just closes; otherwise "Keep Salted Caramel Cake as a draft?" / "You can finish it later from Recipes." / Keep as draft · Discard. Tapping outside goes back to the recipe.
- **On the Recipes list**, drafts are cards with a "Draft" tag and "Not finished" ("Untitled recipe" until named). They follow the chips and search like any recipe. Tapping one opens it on the step she left.
- Drafts never count in totals and never appear in "Add a recipe". Saving turns the draft into the recipe.

**Acceptance**
- A recipe can't be saved without a yield type and amount.
- Ingredient cost equals the sum of all lines, including sub-recipe lines.
- A loop is blocked with a clear message.
- A sub-recipe line can't be added when the sub-recipe lacks the needed yield.

### F6. Scaling calculator

The recipe screen **is** the calculator. It opens at ×1.

**Ways to scale.** Three linked fields; typing in one updates the others.

| Field | She enters | Needs |
|---|---|---|
| × multiplier | 0.5, 1.5 | Nothing |
| Grams | 800 | A weight yield |
| Pieces | 36 | A count yield |

- A field the yield can't support is hidden, with a note on what to add ("Add the dough weight to scale by grams").

**What it shows**
- Every amount scaled, grouped by section, with the cost of each line.
- Sub-recipes broken down inline, scaled.
- **Costs tab:**
  - ingredient total and each overhead line, then the total cost
  - cost per piece and/or per gram
  - selling price with its method, profit and margin
- **Overhead can be edited for this calculation only.** The line gets an "edited" tag and a reset button; the saved recipe is unchanged.
- **"Scaled ×0.533"** with a Reset button while not at ×1.
- **Show the maths** toggle: "800 g ÷ 1,500 g = ×0.533".
- **Incomplete totals stay visible, greyed out,** under a warning banner ("Incomplete: 1 ingredient has no price").

**Rules**
- Nothing in the calculator is saved. Leaving the recipe returns it to ×1.
- Works fully offline.
- The screen stays on while open (Wake Lock).

**Acceptance**
- Scaling her 1,500 g Vanilla Cake to 800 g gives every ingredient ×0.5333 of its base amount (section 9 fixtures).
- Scaling a 24-piece recipe to 36 gives ×1.5, and per-piece supplies go to 36.
- Editing overhead changes the totals but not the saved recipe.

### F7. Pricing methods

Each recipe has one method (or none); the business has a default.

| Method | She enters | Selling price | Cost ₦10,000 → |
|---|---|---|---|
| Markup % | 50 | cost × (1 + 50%) | ₦15,000 |
| Margin % | 33 | cost ÷ (1 − 33%) | ₦14,925 |
| Fixed profit | ₦2,000 | cost + profit | ₦12,000 |
| Set price | ₦15,000 | the price she types | ₦15,000 |

- **Always shown:**
  - profit = price − cost
  - margin = profit ÷ price
  - markup = profit ÷ cost
  - per piece where a count is known
- **Margin must be under 100%.**
- **No method** = cost only (fillings used inside other recipes). In the new-recipe flow it's a fifth choice, **"Cost only"**, under the four methods (agreed 27 Oct 2026), and the totals show just Total cost and Cost per gram (or each).
- A recipe starts with the business default. A fixed profit or set price is typed per recipe and must be filled in when chosen.
- **When scaling:**
  - a set price scales by the same factor
  - a fixed profit stays the same
  - she can edit either in the calculator
- **When the total is incomplete,** the price shows with the same warning.
- **Her sheet:** markup 50% on most cakes. Cocachio's "Profit ₦2,000" row becomes the fixed profit method.

### F8. Offline and sync

- **Everything works offline.** The phone holds a full copy of the business's data (PowerSync).
- **A sync pill** at the top of tab screens shows one of:
  - "All synced" (fades after a few seconds)
  - "3 changes waiting" (taps open the sync sheet)
  - "Offline" (neutral, never red)
- **The sync sheet** (*SyncSheet.dc.html*) lists the waiting changes (what changed, and when) and the last sync time.
- **Sign out:**
  - **Nothing waiting:** a simple "Sign out?" confirmation.
  - **Changes waiting:** "3 changes haven't synced yet. Connect to the internet first, or they'll be lost," with "Stay signed in" and "Sign out anyway".
  - Signing out clears the copy on the phone.
- **A change the server rejects:**
  - It's dropped so the queue never jams.
  - It's reported to Sentry, and she's told in plain words.
  - Because the app checks everything first, this should only happen after a bug.

### F9. App shell and install

- **Floating tab bar:** Recipes · Ingredients · Settings. Room for Shopping later.
- **The "+" button** creates a recipe or an ingredient, on those tabs only.
- **Settings** (*Settings.dc.html*):
  - Business: name, currency, default pricing
  - Recipes: overhead items, categories
  - App: install on iPhone
  - Account: email, sign out (no change password: sign-in uses email codes; the Settings mockup's row is left out)
- **Install guide** (*InstallGuide.dc.html*): offered once after setup (not when the app is already open from the home screen); always reachable from Settings.
- **Empty states:**
  - Recipes empty → the main button is "Add ingredients", because recipes need prices first.
  - Ingredients empty → "Add your first ingredient".
- **Loading:** grey placeholder cards, only before the first sync.
- **Dark mode** follows the phone's setting.

---

## 4. Calculation rules

All calculations run on the phone in one pure TypeScript module (`lib/calc`), separate from the screens and fully tested with Vitest.

### Unit conversions (same kind only)

| Kind | Base | Conversions |
|---|---|---|
| Weight | g | kg 1,000 · oz 28.3495 · lb 453.592 |
| Volume | ml | l 1,000 · fl oz 29.5735 · tsp 4.929 · tbsp 14.787 · cup 236.588 (US) |
| Count | pcs | none |

### Costing

- **Ingredient cost per unit** = price paid ÷ (quantity bought converted to the measuring unit), from the last restock.
- **Ingredient line cost** = amount × cost per unit.
  - Missing if price or size is empty, or the ingredient is deleted.
- **Sub-recipe line cost** = amount × (sub-recipe ingredient cost ÷ its yield in grams or pieces).
  - Missing if the sub-recipe is deleted or has any missing line.
- **Total cost** = all lines + all overhead lines. Deleted overhead items still count.
- **Scaling multiplier:**
  - by weight: target grams ÷ yield grams
  - by count: target pieces ÷ yield pieces
  - or typed directly
- **What scales:** ingredient and sub-recipe amounts, and a set price.
- **What doesn't:** overhead and fixed profit.

### Display rounding (display only; maths uses full precision)

| What | Rule | Example |
|---|---|---|
| Money | Whole units, business currency | ₦15,430.93 → "₦15,431" |
| Cost per unit | 2 decimals; a whole amount drops ".00" (agreed 25 Oct 2026) | "₦1.20 / g", "₦9.98/g", "₦40 / g", "₦300 / pc" |
| A recipe's cost per gram or each | Per gram as cost per unit, no spaces; each in whole money | "₦6.86/g", "₦899 each" |
| Quantity bought | As typed, up to 2 decimals | "12.5 kg", "1,000 g", "1 pc" |
| Amounts 10 or more | Whole number | 833.33 g → "833 g" |
| Amounts under 10 | Up to 2 decimals | "2.67 g", "1.5 g" |
| Pieces | Up to 2 decimals | "1.6", "0.5" |
| Multiplier | Up to 3 decimals | "×0.533" |

### Missing vs zero

- **No price entered** = missing: the line is flagged and the totals are marked incomplete.
- **₦0 entered** = a real price of zero. No warning.

---

## 5. Technical architecture

| Layer | Choice |
|---|---|
| App | Next.js, installable PWA via Serwist, hosted on Vercel |
| Database, login | Supabase: Postgres, email one-time-code auth, Row Level Security |
| Offline sync | PowerSync: local SQLite copy on the phone, synced with Supabase |
| Styling | CSS Modules + one global `tokens.css` generated from the design system's `tokens.json`. No Tailwind, no component library |
| UI primitives | Native `<dialog>`, `<select>` and form elements; lucide-react icons; Noto Sans via `next/font` (latin + latin-ext, for ₦) |
| Forms | React Hook Form + Zod |
| Tests | Vitest (calculations), Playwright (flows, offline, screenshots), axe (accessibility) |
| Errors | Sentry |

**Notes for the build**
- **Next.js 16 builds with Turbopack.**
  - Turbopack bundles PowerSync's worker and SQLite engine itself (as in PowerSync's Next.js example); nothing is copied to `public/`. The service worker precaches both SQLite `.wasm` builds so the database opens offline.
  - If Serwist gives trouble under Turbopack, build with webpack.
- **PowerSync runs only on the client.** Keep it in a client provider; server-rendered pages get no data.
- **The phone keeps PowerSync's database in OPFS** (`OPFSCoopSyncVFS`), falling back to IndexedDB only where OPFS isn't available (Safari private browsing, Playwright's WebKit). IndexedDB storage needs SQLite's large "Asyncify" build, which iOS 26.0–26.4 runs out of memory compiling: the page is killed and reloads while it sits idle ([WebKit bug 309251](https://bugs.webkit.org/show_bug.cgi?id=309251), fixed in iOS 26.5). Don't switch back to PowerSync's default.
- **The app's files** (component layout, token setup, conventions) follow the design system's `building-in-code.md`.
- **Service worker:** Supabase, PowerSync and Sentry requests bypass it. PowerSync's worker scripts are served from the precache but without their cached address: Turbopack passes the workers' settings in the script address, and WebKit (iPhone) would otherwise lose them and PowerSync wouldn't open on reopening the app.

**Pilot hosting**
- Free tiers of Supabase, PowerSync and Vercel.
- **A daily scheduled check-in** (Vercel cron or GitHub Action) keeps Supabase and PowerSync from pausing after about a week of no use.
- Move to paid plans when testers pay. Vercel's free plan is for non-commercial use.

---

## 6. Data model

### Rules for every table

1. **`uuid` primary key named `id`, generated on the phone.**
2. **Every row carries `business_id`.** Sync and row-level security both filter on it.
3. **The app checks first; the server only enforces what can't fail.** A rejected offline change would otherwise jam the upload queue. Unique names and loop checks are app-side.
4. **Money in minor units (whole kobo for Naira), as `bigint`.** Never `numeric`: PowerSync sends it to the phone as text. Every currency is stored × 100, including any without a minor unit, so changing the currency never changes the stored numbers.
5. **Amounts, sizes and percentages as `double precision`.**
6. **Totals are never stored.**
7. **Soft deletes** (`deleted_at`) for ingredients, overhead items and recipes. Real deletes for categories, sections and lines.
8. **`created_at` and `updated_at`** (`timestamptz`) on every table; a trigger keeps `updated_at` current.
9. **Order is a `double precision` `position`.** Moving a row offline changes only that row.
10. **Composite foreign keys** (`(business_id, ingredient_id)` → `ingredients(business_id, id)`, and so on) keep every reference inside one business.

### Tables

```
businesses
 ├─ business_members
 ├─ categories
 ├─ overhead_items
 ├─ ingredients
 │    └─ ingredient_price_history   server only
 └─ recipes
      ├─ recipe_sections
      │    └─ recipe_lines            an ingredient OR another recipe
      └─ recipe_overhead_lines
```

**1. `businesses`**

| Column | Type |
|---|---|
| id | uuid |
| name | text |
| currency_code | text |
| default_pricing_method | text: `markup` · `margin` · `fixed_profit` · `set_price`; default `markup` |
| default_pricing_percent | double precision; default 50 |
| default_pricing_amount_minor | bigint; left empty in the MVP (Fixed profit and Set price amounts are typed per recipe) |
| created_at, updated_at | timestamptz |

Created only by `create_business`.

**2. `business_members`**

| Column | Type |
|---|---|
| id | uuid |
| business_id | uuid |
| user_id | uuid → auth.users |
| role | text; `owner` in the MVP |
| created_at, updated_at | timestamptz |

Unique on `(business_id, user_id)`. Her name lives in Supabase Auth's user metadata (`display_name`).

**3. `categories`**

| Column | Type |
|---|---|
| id, business_id | uuid |
| name | text |
| position | double precision |
| created_at, updated_at | timestamptz |

A real delete. `recipes.category_id` uses `ON DELETE SET NULL (category_id)` (the column list keeps `business_id`), and the app also clears it locally in the same transaction.

**4. `overhead_items`**

| Column | Type |
|---|---|
| id, business_id | uuid |
| name | text |
| position | double precision |
| deleted_at | timestamptz |
| created_at, updated_at | timestamptz |

**5. `ingredients`**

| Column | Type | Notes |
|---|---|---|
| id, business_id | uuid | |
| name | text | |
| unit | text | g … pcs |
| pack_price_minor | bigint | Last restock's price paid. Empty = missing |
| pack_size | double precision | Last restock's quantity bought. Empty = missing |
| pack_size_unit | text | Last restock's unit |
| notes | text | |
| price_updated_at | timestamptz | Set by the app on every restock |
| deleted_at | timestamptz | |
| created_at, updated_at | timestamptz | |

**6. `ingredient_price_history`** (server only, never synced; insert-only, so `recorded_at` instead of `created_at`/`updated_at`)

| Column | Type |
|---|---|
| id, business_id, ingredient_id | uuid |
| pack_price_minor | bigint |
| pack_size | double precision |
| pack_size_unit | text |
| price_updated_at | timestamptz |
| recorded_at | timestamptz |

**7. `recipes`**

| Column | Type | Notes |
|---|---|---|
| id, business_id | uuid | |
| name | text | |
| category_id | uuid | Empty = Uncategorised |
| notes | text | |
| yield_type | text | `weight` · `count` |
| yield_weight_g | double precision | Required for weight |
| yield_count | double precision | Required for count |
| pricing_method | text | Empty = cost only |
| pricing_percent | double precision | |
| pricing_amount_minor | bigint | |
| deleted_at | timestamptz | |
| created_at, updated_at | timestamptz | |

**8. `recipe_sections`**

| Column | Type | Notes |
|---|---|---|
| id, business_id, recipe_id | uuid | |
| name | text | Empty when it's the only section |
| position | double precision | |
| created_at, updated_at | timestamptz | |

**9. `recipe_lines`**

| Column | Type | Notes |
|---|---|---|
| id, business_id, recipe_id, section_id | uuid | |
| position | double precision | |
| ingredient_id | uuid | Set for an ingredient line |
| sub_recipe_id | uuid | Set for a sub-recipe line |
| amount | double precision | Above 0 |
| created_at, updated_at | timestamptz | |

Exactly one of `ingredient_id` and `sub_recipe_id` is set (server check). Deleting a section deletes its lines (`ON DELETE CASCADE`), so a section delete that uploads before its line deletes is never rejected.

**10. `recipe_overhead_lines`**

| Column | Type | Notes |
|---|---|---|
| id, business_id, recipe_id | uuid | |
| overhead_item_id | uuid | |
| amount_minor | bigint | 0 or more |
| position | double precision | |
| created_at, updated_at | timestamptz | |

**Phone only: `recipe_drafts`** (a PowerSync local-only table; not on the server, never uploaded, wiped on sign-out)

| Column | Notes |
|---|---|
| id, business_id | text |
| name, category_id | For the Recipes list's card, chips and search |
| step | 1, 2 or 3: where she left it |
| form | The whole draft as JSON |
| created_at, updated_at | text |

### Triggers and functions

- **`set_updated_at`:** before every update, on every table.
- **`record_price_history`:** after insert or update on `ingredients`, when price, size or size unit changed. `security definer`.
- **`create_business(name, currency, method, percent, amount)`:**
  - In one transaction: creates the business, adds the caller as owner, and adds the five starter overhead items. Returns the business id.
  - Refuses if the user already has a business.
  - `security definer`. Online only.
- **`is_member(business_id)`:** `security definer`, stable. Used by every policy.

### Row Level Security

- **Business data tables:** select, insert, update and delete when `is_member(business_id)`, checked before and after the change.
- **`businesses`:** select and update for members only. No insert or delete from the app.
- **`business_members`:** users select their own rows. Only `create_business` writes here.
- **`ingredient_price_history`:** no app access.

### PowerSync

- **On Supabase:**
  - a `powersync_role` with replication rights that bypasses RLS and can read `public`
  - a publication named `powersync` listing every synced table (all except price history)
  - Supabase auth turned on in PowerSync
- **Sync Streams (edition 3):** one auto-subscribed stream.
  - A `with:` block finds the user's businesses: `SELECT business_id FROM business_members WHERE user_id = auth.user_id()`
  - `businesses`: where `id` is in that list
  - `business_members`: where `user_id = auth.user_id()`
  - The other eight tables: where `business_id` is in that list
  - Check exact syntax against PowerSync's "Writing queries" docs.
- **Client schema types:**
  - uuid, text, timestamptz → text
  - bigint → integer
  - double precision → real
- **Uploads** go through supabase-js with the user's session, so RLS applies.
  - A full-row change becomes an upsert, a partial change an update, a delete a delete.
  - **Temporary errors** (no network, server busy): retry.
  - **Permanent errors** (rejected data, RLS): drop the change, report it to Sentry, tell her.
- **The sync pill and sheet** read the upload queue. Sign-out checks the queue before clearing.

---

## 7. Loading her spreadsheet

**One-off script, run by Keside, not an app feature.**

| Sheet | Butterlogs |
|---|---|
| Ingredients tab (47 items: price, size, unit) | Ingredients |
| Each finished cake tab with a yield | A recipe |
| Section headers inside a tab ("Crumble", "Salted Caramel") | Sections |
| "Yields-1500g" notes | Weight yield |
| Indirect and Miscellaneous rows | Overhead items + overhead lines, one list |
| Markup % | Pricing method: markup |
| Cocachio "Profit ₦2,000" | Pricing method: fixed profit ₦2,000 |
| Instructions text | Recipe notes |

**Not loaded; she adds them in the app:**
- cookie recipes (no piece counts in the sheet)
- unfinished tabs: Lemon Poppy Seed, Untitled, Red Velvet Cookies frosting, Brown Butter Coffee Cake crumble salt
- sub-recipe links: the caramel in Salted Caramel Cake, Cocachio's sections
- recipes without yields

**Check after loading:** every loaded recipe at ×1 matches its tab's total cost and price. Any difference is a mapping mistake.

---

## 8. Build plan

**Work one milestone at a time.** Each ends with its checks passing and a short note of what was done. The task breakdown and progress for each milestone are in `docs/plan.md`.

**From M3 on, each milestone is a vertical slice:** the components, maths and screens for one part of the app, built together and checked on Keside's iPhone before the next starts. Nothing is built ahead of the screen that needs it, so problems show up while they're cheap to fix.

| # | Milestone | Done when |
|---|---|---|
| M0 | **Accounts** (Keside): GitHub repo, Supabase, PowerSync, Vercel, Sentry. Docs copied into `docs/` | Keys in `.env.local`; both artifact links open in Claude Code |
| M1 | **Offline spike on an iPhone (Keside's).** Next.js + Serwist + Supabase email login + an `ingredients` table with RLS + PowerSync | Installed from Safari, an ingredient added in airplane mode appears in Supabase after reconnecting |
| M2 | **Full data model:** all tables, composite keys, triggers, `create_business`, RLS, publication, sync streams | RLS test with two businesses passes (each sees only its own rows, directly and through PowerSync); a price change writes a history row |
| M3 | **Foundation and getting started:** `tokens.css` from `tokens.json`, global styles, the components these screens use, money format and pricing maths; Welcome, sign up and log in with an email code, Setup, Install guide, empty Recipes, tab bar | On Keside's iPhone, a new user signs up with an email code and reaches the empty Recipes screen with five overhead items; ₦ and tabular figures render |
| M4 | **Ingredients:** units and cost-per-unit maths; list, search, ingredient sheet (add/edit), Restock, delete-in-use warning, empty state | On Keside's iPhone, offline, Flour at ₦15,000 / 12.5 kg shows "₦1.20 / g"; missing and ₦0 behave differently |
| M5 | **Create recipes:** line, sub-recipe, overhead and total maths, loop check; new recipe steps 1–3, category sheet, add-ingredients sheet; Recipes list with chips | On Keside's iPhone, Vanilla Cake made offline shows ₦10,287 on its card and syncs |
| M6 | **Recipe screen (the calculator):** scaling maths; scale bar, Ingredients/Costs, sub-recipe inline, stat tiles, incomplete banner, saved toast | On Keside's iPhone, the Vanilla Cake fixtures show on screen; editing overhead doesn't change the saved recipe |
| M7 | **Change and delete recipes:** "…" menu, Edit recipe with Discard, delete flows | An edit made offline syncs; deleting a sub-recipe in use marks its users incomplete |
| M8 | **Settings and sync:** Settings, overhead items, categories, sign out (both variants), sync sheet, loading, dark mode | The sign-out warning appears with changes waiting; every screen is checked in dark mode |
| M9 | **Load her spreadsheet** (section 7) | Every loaded recipe matches its tab at ×1 |
| M10 | **Hardening:** daily keep-alive, source maps, Playwright offline tests, screenshot comparison with the mockups at 390 × 844, axe on every screen, her-phone pass (₦, tabular numbers, keyboard, safe areas, Wake Lock) | No failing checks; ₦ renders on her phone |
| M11 | **Pilot:** she uses it for real for 1–2 weeks | Issues logged and fixed |

---

## 9. Test fixtures (from her spreadsheet)

**Vanilla Cake at ×1 (1,500 g):** ingredients ₦4,937 · overhead ₦5,350 · total **₦10,287** · ₦6.86/g · markup 50% → price ₦15,431, profit ₦5,144.

From her sheet's Vanilla Cake and Ingredients tabs (`tests/fixtures/vanilla-cake.ts`):

| Ingredient | Price paid | Quantity bought | Amount | Cost |
|---|---|---|---|---|
| Sugar | ₦20,000 | 12,500 g | 380 g | ₦608 |
| Flour | ₦15,000 | 12,500 g | 350 g | ₦420 |
| Baking powder | ₦6,000 | 450 g | 12 g | ₦160 |
| Salt | ₦600 | 500 g | 5 g | ₦6 |
| Oil | ₦4,000 | 700 ml | 118 ml | ₦674.29 |
| Vanilla extract | ₦5,000 | 500 ml | 10 ml | ₦100 |
| Yogurt | ₦1,500 | 200 g | 118 g | ₦885 |
| Milk | ₦4,000 | 1,000 ml | 296 ml | ₦1,184 |
| Eggs | ₦300 | 1 pc | 3 pcs | ₦900 |

**Vanilla Cake scaled to 800 g (×0.5333):**

| Ingredient | Amount | Cost |
|---|---|---|
| Sugar | 203 g | ₦324 |
| Flour | 187 g | ₦224 |
| Baking powder | 6.4 g | ₦85 |
| Salt | 2.67 g | ₦3 |
| Oil | 63 ml | ₦360 |
| Vanilla extract | 5.33 ml | ₦53 |
| Yogurt | 63 g | ₦472 |
| Milk | 158 ml | ₦632 |
| Eggs | 1.6 | ₦480 |

- **Totals:** ingredients ₦2,633 · overhead ₦5,350 · total **₦7,983** · ₦9.98/g · price **₦11,975** (markup 50%) · profit ₦3,992.
- **Its overhead at ×1:** Gas ₦500 · Electricity ₦500 · Transport ₦1,000 · Labour ₦3,000 · Pan maintenance ₦100 · Oven maintenance ₦100 · Goop ₦50 · Baking paper ₦50 · Cling film ₦50.
- **With Labour edited to ₦2,000:** overhead ₦4,350 · total ₦6,983 · ₦8.73/g · price ₦10,475 · profit ₦3,492 · margin 33%.

**Pricing methods at cost ₦10,000:** markup 50% → ₦15,000 · margin 33% → ₦14,925 · fixed ₦2,000 → ₦12,000 · set ₦15,000 → ₦15,000.

**Units and missing prices**
- ₦15,000 per 12.5 kg, measured in g → ₦1.20 per g.
- ₦1,000 per 50 pcs → ₦20 per pc. 12 bags scaled ×3 → 36 bags = ₦720.
- A ₦0 ingredient gives no warning. An empty price marks the total incomplete.

---

## 10. Decisions log

| Topic | Decision |
|---|---|
| Name | Butterlogs |
| Login | One-time email code (changed 19 Oct 2026 from email + password). No magic links (they open in Safari, not the installed app); no Google sign-in in the MVP |
| Currencies | Naira, US Dollar, British Pound, Euro; the phone's region picks the first, otherwise Naira |
| Money in minor units | Always × 100, whatever the currency |
| Email sender | Resend via Supabase custom SMTP, on Keside's domain (19 Oct 2026) |
| Default pricing at setup | Method for all four; a default % only for Markup and Margin. Fixed profit and Set price amounts are per recipe (19 Oct 2026) |
| Offline | Full offline (PowerSync), from day one |
| Cost per unit on screen | 2 decimals, but a whole amount drops ".00": "₦1.20 / g", "₦40 / g" (25 Oct 2026; the PRD said 2 decimals, the mockups showed whole prices) |
| Ingredient list order | A to Z by name (25 Oct 2026) |
| Recipe list order | Most recently updated first, drafts included (27 Oct 2026, the design system's default). No "…" sort menu: name sort isn't in the PRD |
| Drafts | An unfinished recipe is a draft on the phone only; several allowed; × asks Keep as draft · Discard (27 Oct 2026) |
| Overhead in the new-recipe flow | Starts empty; pick items or create one on the spot (27 Oct 2026) |
| Cost only | A fifth pricing choice in the flow (27 Oct 2026) |
| Sections | The first is never named; added ones need a name; lines move within a section, whole sections move in M7 (27 Oct 2026) |
| New ingredient while building a recipe | From the Add ingredients sheet, through New ingredient and Restock (27 Oct 2026) |
| Empty required boxes | Red outline, cursor on the first, one line above the buttons (27 Oct 2026) |
| Deleting an unused ingredient | Asks first, like deleting a recipe (25 Oct 2026) |
| Ingredient prices | Entered through Restock, not the ingredient sheet; no "pack" on screen (25 Oct 2026): one sheet with pack price, pack size and "I measure it in" side by side was confusing, and recording a purchase felt like editing the ingredient |
| "Quantity bought", not "Amount bought" | 26 Oct 2026: in Nigeria "amount" usually means money. The label doesn't repeat the unit, since the unit chip sits in the field |
| Phone storage | OPFS, with IndexedDB as the fallback (25 Oct 2026): with IndexedDB, iOS 26 reloaded the page every so often while idle |
| Styling | CSS Modules + tokens; no shadcn/ui or Tailwind |
| Next.js caching | `cacheComponents` off: data lives on the phone, and Serwist's route needs segment config it rejects |
| PWA package | `@serwist/turbopack` (keeps the default Turbopack build); fall back to `@serwist/next` + webpack if it fails the M1 offline test |
| Pilot hosting | Free tiers + daily keep-alive |
| Overhead | Per-recipe amounts; never scales; one list |
| Per-piece supplies | Ingredients in pcs |
| Sub-recipes | Linked, ingredients-only cost, own proportions, no loops |
| Set price when scaling | Scales by the same factor |
| Fixed profit when scaling | Stays the same |
| Cup | US (236.588 ml); metric later |
| Deleting an ingredient in use | Warn and list; lines show deleted and count as missing |
| Deleting an overhead item in use | Warn and list; lines stay as "(deleted)" and still count |
| Deleting a recipe used in others | Warn and list; lines show deleted, totals incomplete |
| Deleting a category | Real delete; recipes become Uncategorised |
| Unique names | Ignoring capitals, among non-deleted items; checked by the app |
| Signing out with unsynced changes | Warn; allow "Sign out anyway" |
| Money | Whole kobo in `bigint` |
| Price history | Server-only, filled by a trigger, not shown in the MVP |
| Spreadsheet | Load ingredients and finished cakes; she adds the rest |
| Build order | Vertical slices from M3: each milestone builds its own components, maths and screens and is checked on a real iPhone (changed 19 Oct 2026, replacing "all components, then all maths, then screens") |

---

## 11. Open items

| Item | Proposed |
|---|---|
| App icon and logo | To design. The name is set in Noto Sans Bold until then |
| Highlight old prices | Not in the MVP. Later: "updated" turns red after a set time |
| Swipe down to close sheets | Not in the MVP (close button and tapping outside). Add Vaul if she misses it |
| Noto Sans ₦ and tabular figures | Check on Keside's iPhone in M3; again on her phone in M10 |

---

## 12. Not in the MVP

**Next**
- **Pantry and shopping list:** stock on hand, in stock / low / out (set by her), a market list she ticks off, and updating prices as she buys.

**Later**
- Baking sessions (stock goes down as she bakes) and recipe steps
- Expiry dates and low-stock levels
- **Orders:** combining several recipes plus extras (box, board, decorations) into one price. This is how a whole decorated cake gets priced.
- Profit tracking (uses the price history)
- Suppliers and inventory, ingredient categories
- Pan sizes (scale by pan area)
- Recipe duplication
- Staff logins and roles
- Payments
- Converting between kinds of unit (cups ↔ grams)
- A tablet and laptop layout
