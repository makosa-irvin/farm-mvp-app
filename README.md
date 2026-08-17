# Field Ledger — Farm Production & Input Tracking (Phase 1 MVP)

A React + Vite + Tailwind implementation of Phase 1 from the farm production
tracking design plan: production logging, expense input, direct-cost unit
economics, and a dashboard — scoped deliberately to what's cheap to build
and still demonstrates the core value prop (real cost per egg/liter/kg).

## Testing

```bash
npm test              # unit + component tests, once
npm run test:watch    # unit + component tests, watch mode
npm run test:e2e      # end-to-end tests in a real browser (needs setup below, once)
npm run test:e2e:ui   # same, with Playwright's interactive UI
```

The Playwright browser only needs installing once: `npx playwright install chromium`.

```
tests/
  unit/                          — Vitest, jsdom, no browser needed
    inventoryLedger.test.js        — pure balance/cost math (src/lib/inventoryLedger.js)
    feedLinking.test.js             — daily-log ↔ consumption-transaction sync
    expenseLinking.test.js           — expense ↔ purchase-transaction sync (the core linking feature)
    helpers.test.js                   — formatting + unitMetrics cost-per-unit calculation
    useFarmData.test.jsx               — the composed hook end-to-end: add expense → stock increases →
                                          log consumption → stock decreases → edit/delete safety checks
    views.smoke.test.jsx                — each view renders without crashing; also pins down the exact
                                           label/option/button text the e2e suite below selects by, so a
                                           text change breaks a fast test here before a slow one in a browser
  e2e/                            — Playwright, real Chromium, drives the actual built app
    helpers.js                      — shared locator helper (see note below) + state-reset helper
    smoke.spec.js                    — app loads, every tab is reachable
    inventory-linking.spec.js         — the core feature end-to-end: record a feed expense in the real
                                         UI → inventory increases; log feed use → inventory decreases;
                                         deleting an expense whose stock is in use is blocked, not silent
```

**Why a custom locator helper in `tests/e2e/helpers.js`:** the app's `FieldLabel` component renders a plain `<label>` with no `for`/`id` link to its input, so Playwright's usual `getByLabel()` can't find these fields (confirmed via the DOM check in `views.smoke.test.jsx` before writing the e2e tests around it). `fieldByLabel(page, text)` walks from the label's text to its parent `<div>` and finds the input there instead. Wiring up proper `htmlFor`/`id` pairs across every form would fix this more fundamentally (and is a real accessibility gap worth closing on its own merits, separate from testing) — noted here rather than done, to keep this change scoped to adding tests.

## Setup

Requires Node.js 18+.

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build      # production build to dist/
npm run preview    # preview the production build locally
```

## Project structure

```
src/
  main.jsx              — app entry point
  App.jsx                — navigation, top-level state, CRUD handlers
  constants.js            — unit types, expense categories, periods, tabs
  index.css               — Tailwind + design tokens (colors, fonts, custom classes)
  lib/
    helpers.js             — formatting, date/period math, unit-economics calculation
    usePersistentState.js  — localStorage-backed React state hook
    styleTokens.js          — shared input styling
  components/             — small reusable UI pieces (chips, cards, empty states)
  views/                   — one file per tab (Dashboard, Daily Log, Expenses, Units, Analytics)
```

## What's implemented (Phase 1 scope)

- **Production units** — flocks, herds, or plots with a type, starting headcount, and start date
- **Daily log** — adaptive form (egg grades vs. single quantity), feed consumed, mortality, notes
- **Expenses** — categorized, optionally linked to a unit; unlinked expenses are tracked separately as "unallocated"
- **Analytics** — cost per unit/dozen, feed conversion ratio, production rate, mortality rate — **direct costs only**
- **Dashboard** — today's production, MTD direct vs. unallocated costs, per-unit snapshot

## Known scope limits (by design — see Phase 2+ in the design plan)

- **No cost allocation engine yet.** Shared costs (labor across units, whole-farm utilities, depreciation) are tracked as "unallocated" but not split across units. That's the Cost Allocation Engine from the design plan (§4), planned for Phase 2.
- **Approximate rate metrics.** Production rate and mortality rate use the *current* live headcount as a stand-in for headcount-over-time, since there's no `FlockMovement` history yet. Exact once that's added.
- **No sales/revenue module.** Margin-per-bird and break-even price need sale records, which are Phase 3.
- **Local-only persistence.** Data is stored in the browser's `localStorage` — per device, per browser, nothing syncs across users or devices. There's no backend yet. The design plan's tech stack (Node/Express + PostgreSQL via Prisma) is the natural next step; this frontend's component structure and data shapes are meant to carry over largely unchanged once that API exists — swap `usePersistentState` for real API calls.
- **No auth, no multi-farm.** Single implicit farm, single user, no login.

## Design notes

Palette and type are defined as CSS custom properties in `src/index.css`
(`--forest`, `--amber`, `--rust`, etc.) rather than Tailwind's default theme,
so custom colors work without extending `tailwind.config.js`. The rounded
"tag chip" selectors (with the small notch) are a deliberate nod to
livestock ear tags / coop tags, used for picking production units throughout
the app.
