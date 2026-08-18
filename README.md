# Field Ledger — Farm Production & Input Tracking

Field Ledger is a mobile-first, offline-capable farm operations tracker, built for smallholder and small-commercial farmers — the primary design target is a middle-aged Kenyan farmer with limited or inconsistent internet access, no accounting background, and no assumption of technical fluency. It records what farm groups produce, what the farm spends and loses, and what's in stock, then derives simple cost and surplus estimates from that data.

The application is a **pure client-side app**: it runs entirely in the browser and persists all data in `localStorage`. There is no backend, no server, no account system, and no data leaves the device. This is a deliberate architectural choice, not a stopgap — for the target persona, working with zero connectivity, always, is treated as more important than any feature that would require a network connection. See [Known limitations](#known-limitations) below, and [`docs/DESIGN_PLAN.md`](docs/DESIGN_PLAN.md) for the fuller reasoning and roadmap.

## What the application does

### Farm groups

Add and manage the flocks, herds, crop plots, or other groups the farm produces from. A group has a type (eggs, milk, crop, or other), a starting headcount, a start date, and an optional selling price used to estimate revenue.

Internally this remains the `units` data model (`unit.id`, `unitId` on logs/expenses, `UnitsView.jsx`, etc.) — "Farm groups" is the name used everywhere in the interface. The two names are intentionally different: renaming the underlying data model would require migrating every farm that has already used the app, for a purely cosmetic gain.

### Daily production log

Record production for a farm group, including:

- Production quantity, with egg-specific grading (large/medium/small) for layer flocks
- Feed consumed, optionally linked to a tracked inventory item
- Mortality / losses
- Date and notes

Recording feed use against a tracked inventory item automatically creates a matching inventory *consumption* transaction — no separate manual step. Editing or deleting the log keeps that linked transaction in sync.

### Expenses (money spent & farm costs)

Record actual cash payments, optionally linked to a farm group and/or an inventory item + quantity purchased. Linking to an inventory item automatically creates a matching *purchase* transaction in the inventory ledger, using the expense amount divided by the purchased quantity as the unit cost — no double entry required.

**Non-cash costs are also shown here, not just cash payments.** When stock is used, lost/spoiled, or written down through a manual inventory correction, the app automatically generates a matching non-cash expense entry so the cost is visible without pretending a second cash payment happened. These synthetic entries are clearly marked (a distinct icon and label, "Stock loss / spoilage" or "Stock used / deduction") and are **read-only** in this view — correcting one means editing or removing the underlying update in Stock, which keeps the Expenses entry in sync automatically. This isn't a UI limitation so much as a safety rail: the code that edits/deletes cash expenses doesn't understand this reverse link, and letting it touch a synthetic entry has been confirmed to corrupt the inventory ledger (see the git history around `fix/synthetic-expense-safety-and-naming` for the specifics).

Supplier name and payment method (Cash / M-Pesa / Bank / On credit) can optionally be recorded on any cash expense. Neither drives any calculation today — they're captured so questions like "which supplier costs more" or "how much of my spend is M-Pesa" become answerable once enough expenses carry them.

Optional fields never block the fast path: adding an expense with just a category, amount, and date takes as many taps as it always did.

### Inventory ledger (Stock)

Inventory balances are derived — opening stock plus every signed transaction since — rather than stored and separately edited, so they can't drift out of sync with their own history. Supported transaction types:

- Bought stock (`purchase`, in)
- Used it up (`consumption`, out)
- Lost or spoiled (`wastage`, out)
- Returned to stock (`return`, in)
- Moved between farm groups (`transfer`)
- Found extra / missing some — corrects a miscount (`adjustment_in` / `adjustment_out`)
- Counted what I actually have (`stock_count` — computes the in/out delta needed to match a physical count)
- Sold (`sale`, out)

The stock-update form defaults to two big buttons — "I bought stock" and "I used stock" — covering the overwhelming majority of real updates, with the remaining types tucked behind a "Something else?" link rather than presented as nine equally-weighted options in one dropdown.

Outgoing stock is valued at weighted-average cost. Transfers are represented as a paired outgoing/incoming entry. Wastage and downward corrections (but not transfers or sales) are recognized as real operating costs at the point they're recorded, not just at purchase — see the Expenses section above.

### Dashboard

The farmer's first screen, ordered by urgency rather than by data structure: an estimated monthly surplus, then anything that actively needs a decision (low stock, recent losses) *before* passive stats like today's production totals, then a quick-record shortcut row. "Produced today" only sums quantities across farm groups when they're all the same production type (e.g., all egg flocks) — mixing eggs and liters of milk into one number would be a meaningless sum, so mixed-type days show a count of kinds produced instead.

### Analytics

Per-group cost, revenue, and profit, with 2–3 headline figures visible by default and everything else (cost breakdown by category, feed-conversion figures, laying rate, loss rate) behind "See more details." Includes a small hand-rolled production trend chart (no charting library — kept dependency-light on purpose) and a proportional cost-breakdown bar list, both intentionally visual rather than more rows of numbers.

### Offline & installability

The app is installable as a PWA (see `public/manifest.json`, `public/sw.js`) — a runtime-caching service worker caches the app shell (including the Google Fonts CSS/font files) so a repeat visit, or a fresh visit with no connection, still loads. A small status indicator in the header shows whether the browser currently has connectivity and confirms data is saved on-device either way — deliberately worded to avoid implying any cloud sync exists, since none does.

## Architecture

```text
src/
├── main.jsx                 # React entry point, registers the service worker
├── App.jsx                  # Top-level state (active tab, toast, confirm dialog) and composition
├── constants.js              # Shared application constants (unit types, expense categories, tabs...)
├── index.css                 # Global styles and design tokens
│
├── layout/                   # App-shell components (not reusable UI primitives — see components/)
│   ├── Header.jsx             # Responsive nav: desktop top tabs, mobile bottom bar + "More"
│   ├── NavTabs.jsx
│   └── MainContent.jsx        # Routes the active tab to its view
│
├── components/                # Reusable, mostly presentational UI pieces
│   ├── ConfirmDialog.jsx        # Styled window.confirm() replacement
│   ├── MobileQuickActions.jsx   # Floating quick-capture menu (mobile only)
│   ├── OfflineStatus.jsx        # Connectivity indicator, header
│   └── TrendChart.jsx           # Hand-rolled SVG bar chart, no dependency
│
├── views/                      # Feature-level screens/tabs
│   ├── Dashboard.jsx
│   ├── DailyLogView.jsx
│   ├── ExpensesView.jsx
│   ├── InventoryView.jsx
│   ├── UnitsView.jsx            # "Farm groups" in the UI
│   └── AnalyticsView.jsx
│
├── hooks/
│   ├── useFarmData.js           # Owns persistent state, composes domain actions
│   └── useConfirmDialog.js      # Promise-based confirm(), backing ConfirmDialog
│
└── lib/
    ├── actions/                  # CRUD and cross-domain state mutations
    ├── inventoryLedger.js        # Pure inventory balance/cost calculations
    ├── feedLinking.js            # Daily-log ↔ inventory synchronization
    ├── expenseLinking.js         # Expense ↔ inventory synchronization
    ├── helpers.js                 # Formatting, unit economics, cost breakdown, trends
    ├── styleTokens.js             # Shared input styling
    └── usePersistentState.js      # localStorage-backed state hook
```

The important boundary: **React state lives in `useFarmData`; domain calculations and cross-domain synchronization rules live in plain JavaScript in `src/lib`.** This is what makes the inventory ledger, the feed/expense linking, and the unit-economics math testable without rendering a single component.

### Data flow

```text
Farm group
     │
     ├── Daily log ──────────────► feed consumption transaction (auto)
     │
     └── Expense ────────────────► purchase transaction (auto, if linked to a stock item)
                                       │
Inventory item ◄───────────────────────┘
     │
     └── Inventory ledger ───────► balance + weighted-average cost
              │                            │
              │                            ├── non-cash expense (auto, for losses/deductions)
              │                            │
              └────────────────────────────┴──► Dashboard / Analytics
```

All persisted data lives in browser `localStorage`. The inventory ledger is the single source of truth for stock balance and cost — the balance is always calculated from the transaction history, never stored as a second, independently-mutable value.

## Project structure

| Area | Responsibility |
| --- | --- |
| `src/views` | User-facing screens and forms |
| `src/layout` | App shell: navigation, routing between views |
| `src/components` | Small reusable UI pieces |
| `src/hooks` | React state composition and the application-facing API |
| `src/lib/actions` | Domain CRUD operations and state mutations |
| `src/lib/*Linking.js` | Pure synchronization rules between related domains |
| `src/lib/inventoryLedger.js` | Inventory transaction normalization, balance, and valuation |
| `public/` | PWA manifest, service worker, icons |
| `tests/unit` | Unit, hook-integration, and component smoke tests |
| `tests/e2e` | Playwright browser-level tests |

## Tech stack

- **React 18** — UI and component model
- **Vite 5** — development server and production build
- **Tailwind CSS 3** — utility styling, plus a handful of hand-written CSS files under `src/styles/components/` for things Tailwind utilities don't cover well (confirm dialog, mobile nav, buttons)
- **Lucide React** — interface icons
- **Vitest + Testing Library** — unit/component tests
- **Playwright** — end-to-end browser tests (see the note under [Testing strategy](#testing-strategy))
- **`localStorage`** — the only persistence layer; no database, no backend

Exact dependency versions are in `package.json` / `package-lock.json`.

## Getting started

### Requirements

- Node.js 18 or newer
- npm

### Install

```bash
npm install
```

### Start development

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

### Build for production

```bash
npm run build
npm run preview
```

### Run tests

```bash
npm test
npm run test:watch
npm run test:e2e
npm run test:e2e:ui
```

For Playwright's Chromium browser, install it once with:

```bash
npx playwright install chromium
```

## Testing strategy

### Unit and component tests

`tests/unit` covers the ledger math, the feed/expense linking rules, the composed `useFarmData` hook, the confirm-dialog flow, and rendering/interaction behavior for each view. These are fast, run in every development environment without a real browser, and are the primary safety net for this project.

**One real limit worth knowing:** unit/component tests use `jsdom`, which does not evaluate CSS media queries the way a real browser viewport does, and cannot catch a CSS rule that fails to compile into the final stylesheet at all. Two separate real bugs in this project's history — a `@import` ordering mistake that silently dropped button/table styles from the build, and a component that stopped importing its own stylesheet — both passed the full test suite and a clean `npm run build` while being genuinely broken in the browser. Treat "the tests are green" as necessary, not sufficient; actually loading the built app matters, especially after any CSS change.

### End-to-end tests

`tests/e2e` drives the built application in a real Chromium browser via Playwright, covering the most important cross-domain flow: recording a feed purchase increases stock, recording feed use decreases it, and unsafe edits/deletions are rejected. **These have not been executed in every environment this project has been developed in** — some sandboxed environments can't reach the Chromium download. The test files are kept in sync with the current UI (field labels, button text) as a matter of discipline, and `tests/unit/views.smoke.test.jsx` includes a small set of tests specifically checking that the fields/labels the E2E specs depend on still exist, as an early warning if they drift — but that's a safety net around the gap, not a substitute for actually running the E2E suite in an environment that can.

## Coding standards

Project-specific conventions are in [`CODING_STANDARDS.md`](CODING_STANDARDS.md). In short:

1. Keep components focused on rendering and user interaction.
2. Keep business calculations and synchronization rules in pure functions where practical.
3. Keep persistent state ownership in `useFarmData`; don't introduce a competing source of truth.
4. Use descriptive names and early returns instead of deeply nested conditionals.
5. Comment **why** non-obvious code exists, not what obvious syntax is doing.
6. Keep comments current; remove historical/debug commentary once the issue it describes no longer applies.
7. Preserve stable public function signatures unless a change is intentional and every caller/test is updated with it.
8. Add or update tests when changing business rules, data synchronization, or user-visible behavior — and prefer a test that's proven to fail against the old code, not just one that passes against the new code, for anything fixing a real bug.

## Known limitations

This is a deliberately scoped application, not an unfinished one — most of what's listed here is a boundary chosen for the target persona, not a gap waiting to be closed by default:

- **Browser-only persistence, by design.** Data lives in `localStorage` on the current device only. There is no cloud backup yet — the design plan's recommended next step is a plain export-to-file / import-from-file pair (using the phone's own file sharing), which adds a safety net without compromising offline-first the way a cloud sync feature would.
- **Single user, single device, single farm.** No authentication, no multi-device sync, no multi-tenant support. If this is ever built, the working assumption is that it must be additive and backgrounded — the app must stay fully functional with zero connectivity, indefinitely, not just "until the next sync."
- **No language other than English.** Deliberately deferred rather than attempted without a fluent speaker involved — a bad translation in a money-tracking tool is worse than none, especially for a persona already unsure of the numbers.
- **Direct costs only.** Shared costs (farm-wide labor, utilities, depreciation) are not allocated across farm groups.
- **Approximate rate metrics.** Some production/mortality rates use the current live headcount, since historical headcount movement isn't modeled yet.
- **Client-side validation only.** No backend means no server-side validation, authorization, or concurrency control — this is fine for a single-user local app and would need real design work before ever becoming multi-user.
- **The E2E suite's execution history is incomplete** — see [Testing strategy](#testing-strategy).

## Future direction

The current domain boundaries (a pure calculation/sync layer in `src/lib`, decoupled from the React state layer in `useFarmData`) are designed so that a future backend, if one is ever justified by real multi-device demand, can be added without a rewrite — `usePersistentState` is the one seam that would need to grow a network-aware sync layer alongside it, not replace the pure functions everything else depends on. The offline-first guarantee should survive that transition unchanged: a user with no connectivity should have an identical experience to one with perfect connectivity, indefinitely.

Likely next steps, roughly in the order they're likely to matter: a Kiswahili translation (with a fluent speaker involved from the start), export/import for backup, then — only if real usage shows it's needed — some form of opt-in multi-device sync built around a background queue rather than a blocking one.

## Design notes

The visual system uses CSS custom properties in `src/index.css` for the core palette and typography. Form inputs use 16px text (not the more typical 14px) specifically to avoid iOS Safari's auto-zoom-on-focus below that size, and interactive elements target a 44px minimum touch size — both chosen for a persona using this primarily on a phone, often outdoors, often one-handed. The mobile bottom navigation and floating quick-actions menu account for `env(safe-area-inset-bottom)` so they don't collide with a phone's home-indicator area.

## License

No open-source license is currently declared. Treat the repository as all-rights-reserved unless the owner adds a license explicitly.
