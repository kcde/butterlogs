# Butterlogs

A phone-first app (installable as a PWA) for bakers. It scales recipes and works out their costs from bulk pack prices. The pilot user is The Butter Puff Co.

## Where things are

- **`docs/prd.md` is the source of truth** for features, rules, calculations, data model, sync, the build plan and test fixtures. Read only the sections the current task needs, not the whole file every time.
- **`docs/plan.md`** breaks each milestone into tasks and tracks progress. Check its Status table to see where we are.
- **Design system:** https://claude.ai/artifact/7H2cKYXx1qJq2PuN1V6Wa2
  - tokens, 38 components with props in `components/index.d.ts`, `bundle.css`
  - `screen-patterns.md`
  - `building-in-code.md`: follow it for folder layout and conventions
- **Mockups:** https://claude.ai/artifact/JChFePQ5mcTiZAVG4XScWw
  - One file per screen, e.g. `Recipe.dc.html`. The PRD refers to screens by these names.
- **`docs/costing-journal.xlsx`:** her spreadsheet, used for loading her data (M9) and checking totals.

Read the two artifacts with the Artifact tool, fetching only the files you need.

**When sources disagree:**
- Behaviour and data: the PRD wins.
- Look: the design system wins.
- A specific screen's layout: the mockup wins.
- If something is in none of them, ask. Don't invent it.

## How we work

- **Build one milestone at a time** (PRD section 8, M0–M11). From M3 on, each milestone is a vertical slice: its components, maths and screens, checked on a real iPhone.
  - Before starting: say what you'll do.
  - When finished: run the checks, then write 2–3 lines on what changed and what's next. Wait for me before starting the next milestone.
  - Keep `docs/plan.md` current: tick tasks as they're done, and on finishing set the status, date and Notes.
- **One branch per milestone.** Branch from an up-to-date `main` (e.g. `m1-offline-spike`), commit there, and push the branch. I merge it. Never commit or push to `main` directly.
- **Don't add features, screens or fields** that aren't in the PRD. If you think something is missing, suggest it and wait.
- **Talk through big decisions before writing them:** schema changes, new libraries, changing a rule. Explain why in plain words.
- **Keep the PRD up to date.** When we change a decision, update the PRD in the same change.

## Stack

- Next.js on Vercel, made installable with Serwist
- Supabase: Postgres, email + password auth, Row Level Security
- PowerSync for offline sync (Sync Streams, edition 3)
- CSS Modules + `styles/tokens.css`, generated from the design system's `tokens.json`
  - No Tailwind, no component libraries
  - Native `<dialog>` and `<select>`, lucide-react icons
  - Noto Sans via `next/font` with latin-ext (needed for ₦)
- React Hook Form + Zod
- Vitest, Playwright, axe
- Sentry

## Rules that are easy to get wrong

**Money and amounts**
- Store money as whole kobo in `bigint`, never `numeric` (PowerSync turns numeric into text).
- Store amounts and percentages as `double precision`.
- Never store totals. Always calculate them.

**Missing vs zero**
- An empty price means missing: totals are marked incomplete and shown greyed out.
- ₦0 is a real price, with no warning.

**Scaling**
- Scales: ingredient and sub-recipe amounts, and a set price.
- Doesn't scale: overhead and fixed profit.

**Rows and IDs**
- IDs are UUIDs made on the phone.
- Every row has `business_id`.
- References use composite foreign keys so they stay inside one business.

**Validation**
- The app checks everything first: unique names (ignoring capitals), sub-recipe loops, required fields.
- The server only enforces what can never fail. A rejected offline change would block the sync queue.

**Deletes**
- Soft delete (`deleted_at`) for ingredients, overhead items and recipes.
- Real delete for categories, sections and lines.

**Where code runs**
- PowerSync runs on the client only.
- Calculations live in `lib/calc` as pure functions, and every change to them runs the PRD section 9 fixtures.

**Display rounding**
- Rounding is for display only (PRD section 4). The maths always uses full precision.

## Commands

```
npm run dev         # local app
npm run build       # production build (Turbopack)
npm run typecheck   # tsc --noEmit
npm run lint        # ESLint
npm test            # Vitest, src/**/*.test.ts
npm run e2e         # Playwright, e2e/, 390 × 844 light + dark, against a production build
npm run test:db     # Vitest, tests/db/: RLS, keys, triggers and PowerSync against the live project, with throwaway users (needs .env.local)
```

Database changes are migrations in `supabase/migrations/`, applied with `npx supabase db push`. PowerSync's sync streams live in `powersync/sync-config.yaml` and are deployed from the PowerSync dashboard.

## Done means

- Typecheck, lint and tests pass.
- The screen matches its mockup at 390 × 844, in light and dark.
- It works offline.
- No new axe errors.
