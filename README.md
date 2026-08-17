# Field Ledger — Farm Production & Input Tracking

Field Ledger is a client-side farm operations tracker built with React, Vite, and Tailwind CSS. It records production, production units, expenses, and inventory movements, then derives operational and direct-cost metrics from that data.

The current application is an MVP: it runs entirely in the browser and persists data in `localStorage`. There is no backend, authentication, multi-user sync, or sales/revenue module yet.

## What the application does

### Production units

Create and manage the farm's production units, such as flocks, herds, or plots. A unit has a type, starting headcount, and start date.

### Daily production log

Record production for a unit, including:

- Production quantity and, where applicable, egg grades
- Feed consumed
- Mortality
- Date and notes

When feed consumption is recorded from a daily log, the application creates a linked inventory `consumption` transaction. Editing or deleting the log updates or removes that linked transaction.

### Expenses

Record farm expenses and optionally associate a purchase with an inventory item and quantity. A linked inventory purchase is created automatically, using the expense amount divided by the purchased quantity as the purchase unit cost.

The application prevents edits or deletions that would make inventory negative after already-consumed stock is taken into account.

### Inventory ledger

Inventory balances are derived from an opening stock quantity plus signed ledger transactions. Supported transaction types are:

- Purchase / stock in
- Consumption / usage
- Wastage / spoilage
- Return to stock
- Transfer between production units
- Adjustment increase / decrease
- Stock count adjustment
- Stock sale

Outgoing stock is valued using weighted-average cost. Transfers are represented as paired outgoing and incoming ledger entries.

### Dashboard and analytics

The dashboard summarizes current production and direct costs. Analytics provide direct-cost and operating metrics such as:

- Cost per production unit / dozen where applicable
- Feed conversion ratio
- Production rate
- Mortality rate
- Unit-level direct-cost summaries

These metrics are intentionally limited by the current data model; see [Known limitations](#known-limitations).

## Architecture

The application is organized around a small state-composition layer and pure domain functions:

```text
src/
├── main.jsx                 # React entry point
├── App.jsx                  # Navigation and view composition
├── constants.js             # Shared application constants
├── index.css                # Global styles and design tokens
│
├── components/              # Reusable presentation components
├── views/                   # Feature-level screens/tabs
│   ├── Dashboard.jsx
│   ├── DailyLogView.jsx
│   ├── ExpensesView.jsx
│   ├── InventoryView.jsx
│   ├── UnitsView.jsx
│   └── AnalyticsView.jsx
│
├── hooks/
│   └── useFarmData.js       # Owns persistent state and composes domain actions
│
└── lib/
    ├── actions/             # CRUD and cross-domain state mutations
    ├── inventoryLedger.js   # Pure inventory balance/cost calculations
    ├── feedLinking.js       # Daily-log ↔ inventory synchronization
    ├── expenseLinking.js    # Expense ↔ inventory synchronization
    ├── helpers.js           # Formatting and shared calculations
    ├── styleTokens.js       # Shared styling tokens
    └── usePersistentState.js# localStorage-backed state hook
```

The important boundary is that **React state lives in `useFarmData` while domain calculations and synchronization rules are kept in plain JavaScript functions**. This makes inventory and linking logic testable without rendering React components.

### Data flow

```text
Production unit
      │
      ├── Daily log ──────────────► feed consumption transaction
      │
      └── Expenses ───────────────► purchase transaction
                                      │
Inventory item ◄─────────────────────┘
      │
      └── Inventory ledger ───────► balance + weighted-average cost
                                      │
                                      ├── Dashboard
                                      └── Analytics
```

All persisted application data currently lives in browser `localStorage`. The inventory ledger is the source of truth for inventory balance; the current balance is calculated rather than stored as a second mutable value.

## Project structure

| Area | Responsibility |
| --- | --- |
| `src/views` | User-facing screens and forms |
| `src/components` | Small reusable UI components |
| `src/hooks` | React state composition and application-facing API |
| `src/lib/actions` | Domain CRUD operations and state mutations |
| `src/lib/*Linking.js` | Pure synchronization between related domains |
| `src/lib/inventoryLedger.js` | Inventory transaction normalization, balance, and valuation |
| `tests/unit` | Unit, integration-style hook, and view smoke tests |
| `tests/e2e` | Browser-level Playwright tests |

## Tech stack

- **React 18** — UI and component model
- **Vite 5** — development server and production build
- **Tailwind CSS 3** — utility styling
- **Lucide React** — interface icons
- **Vitest + Testing Library** — unit/component tests
- **Playwright** — end-to-end browser tests
- **`localStorage`** — current persistence layer

The exact dependency versions are defined in `package.json` and `package-lock.json`.

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

The test suite is split into two levels.

### Unit and component tests

`tests/unit` covers pure business rules, linking behavior, the composed `useFarmData` hook, and basic rendering of each view. These tests are fast and should catch calculation, synchronization, and UI-contract regressions before browser tests are run.

### End-to-end tests

`tests/e2e` runs the built application in a real Chromium browser. The inventory-linking flow verifies the most important cross-domain behavior: recording a feed purchase increases stock, recording feed usage decreases it, and unsafe deletion/editing is rejected.

## Coding standards

The project-specific coding rules are documented in [`CODING_STANDARDS.md`](CODING_STANDARDS.md). In short:

1. Keep components focused on rendering and user interaction.
2. Keep business calculations and synchronization rules in pure functions where practical.
3. Keep persistent state ownership in `useFarmData`; do not introduce competing sources of truth.
4. Use descriptive names and early returns instead of deeply nested conditionals.
5. Comment **why** non-obvious code exists, not what obvious syntax is doing.
6. Keep comments current; remove historical/debug comments when the underlying issue no longer exists.
7. Preserve stable public function signatures unless a change is intentional and all callers/tests are updated.
8. Add or update tests when changing business rules, data synchronization, or user-visible behavior.

## Known limitations

This is an MVP and intentionally has several boundaries:

- **Browser-only persistence.** Data is stored in `localStorage` on the current browser/device. There is no API or database.
- **Single user / single farm.** There is no authentication, tenant separation, or multi-farm support.
- **No revenue or sales accounting.** The application tracks costs and inventory but does not provide a complete sales, revenue, margin, or break-even model.
- **Direct costs only.** Shared costs such as farm-wide labor, utilities, depreciation, or other overhead are not allocated across production units.
- **Approximate rate metrics.** Some production and mortality rates use the current live headcount because historical flock/headcount movement is not yet modeled.
- **Client-side validation only.** Because there is no backend, there is no server-side validation, authorization, or concurrency control.

## Future direction

The current domain boundaries are designed to make a future backend transition straightforward. A later version can replace `usePersistentState` with API-backed persistence while retaining the pure ledger/linking functions and the view/component structure.

Likely future capabilities include authentication, multi-farm support, a database-backed API, historical headcount movements, shared-cost allocation, sales/revenue, and more complete profitability reporting.

## Design notes

The visual system uses CSS custom properties in `src/index.css` for the application's core palette and typography. The rounded tag-like selectors are intentionally used to reinforce the farm/livestock context without making the interface dependent on a large component library.

## License

No open-source license is currently declared. Treat the repository as all-rights-reserved unless the owner adds a license explicitly.
