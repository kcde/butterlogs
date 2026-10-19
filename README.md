# Butterlogs

A phone-first app (installable as a PWA) for bakers. It scales recipes and works out their costs from bulk pack prices.

- What it does and how it's built: [`docs/prd.md`](docs/prd.md)
- Working notes for Claude Code: [`CLAUDE.md`](CLAUDE.md)

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the keys
npx playwright install       # browsers for npm run e2e
```

## Commands

```bash
npm run dev         # local app
npm run build       # production build
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # Vitest (calculation engine)
npm run e2e         # Playwright (builds and serves the app first)
```
