# Mazaosmart

Mazaosmart is a mobile-first, offline-capable farm operations tracker for smallholder and small-commercial farms. It records production, expenses, losses, and inventory, then derives practical cost, revenue, stock, and surplus information from those records.

The primary design target is a Kenyan farmer who may have limited technical experience and unreliable internet access. The application therefore prioritizes plain language, fast data entry, small-screen usability, and offline operation.

## Project status

**Architecture:** React + Vite, with browser `localStorage` as the only persistence layer.

**Backend:** None. There is no API, database, authentication system, or cloud synchronization.

**Offline model:** The core application works without network access. The PWA shell is cached by the service worker so the installed application can be reopened offline.

**Currency:** Kenyan Shillings (KSh) throughout the user experience.

**Important:** This repository is an application codebase, not a financial or accounting system. Calculations are intended to support farm decisions and should not be treated as audited accounting records.

## Features

### Farm groups

Farm groups represent flocks, herds, crop plots, or other production groups. The underlying data model is still named `unit` for compatibility with existing stored data; the UI consistently calls these records **Farm groups**.

Each group can include a type, starting headcount, start date, and optional selling price used for revenue estimates.

### Daily production logs

Record production for a farm group, including:

- Production quantity and egg grading for layer flocks
- Feed consumed, optionally linked to tracked stock
- Mortality or other losses
- Date and notes

When feed is linked to inventory, saving, editing, or deleting a log keeps the corresponding consumption transaction synchronized.

### Expenses

Record cash expenses by category and optionally link them to a farm group or inventory purchase. An inventory-linked purchase automatically creates the corresponding stock transaction, using the expense amount and purchased quantity to determine unit cost.

Inventory losses and deductions can also produce non-cash expense records. These records are deliberately protected from direct editing in the Expenses view; the underlying inventory action is the source of truth.

### Inventory ledger

Stock balances are derived from opening stock plus ledger transactions rather than stored as an independently editable number.

Supported transaction types include:

- Purchase
- Consumption
- Wastage
- Return
- Transfer between farm groups
- Positive or negative adjustment
- Physical stock count
- Sale

Outgoing stock uses weighted-average cost. Transfers are represented by paired ledger entries and do not create or destroy stock.

### Dashboard and analytics

The Dashboard prioritizes information that may require action, such as low stock and recent losses, before passive totals. Analytics provide production, cost, revenue, and profitability views by farm group, with additional metrics available progressively rather than overwhelming the initial screen.

### Offline and installable use

The application is packaged as a PWA. The service worker caches the application shell for repeat/offline loading, while the connectivity indicator communicates the current network state without implying cloud synchronization.

## Architecture

```text
src/
├── main.jsx                 # React entry point and service-worker registration
├── App.jsx                  # Top-level UI state and application composition
├── constants.js             # Shared application constants
│
├── layout/                  # Application shell and navigation
├── components/              # Reusable UI components
├── views/                   # Feature-level screens
├── hooks/                   # React state composition
└── lib/
    ├── actions/             # Domain CRUD and state mutations
    ├── inventoryLedger.js   # Inventory rules, balance, and valuation
    ├── feedLinking.js       # Daily-log ↔ inventory synchronization
    ├── expenseLinking.js    # Expense ↔ inventory synchronization
    ├── helpers.js           # Shared calculations and formatting
    ├── styleTokens.js       # Shared UI styling helpers
    └── usePersistentState.js# localStorage-backed state hook

public/                      # PWA manifest, service worker, and static assets
tests/unit/                  # Unit, hook, and component tests
tests/e2e/                   # Playwright browser journeys
docs/                        # Architecture and design documentation
```

### State and domain boundaries

`useFarmData` is the application state boundary. It owns persistent state and composes the domain action modules.

Business rules belong in `src/lib` whenever possible. In particular:

- `inventoryLedger.js` owns transaction normalization, balances, weighted-average cost, and inventory cost rules.
- `feedLinking.js` keeps daily-log feed usage synchronized with inventory.
- `expenseLinking.js` keeps inventory-linked expenses synchronized with purchases.
- `src/lib/actions` performs domain mutations and coordinates related state changes.

This separation keeps calculations and synchronization testable without rendering React components.

### Data flow

```text
Farm group
   ├── Daily log ────────────► feed consumption transaction
   │
   └── Expense ──────────────► inventory purchase transaction
                                   │
Inventory item ◄───────────────────┘
   │
   └── Ledger ───────────────► balance + weighted-average cost
          │
          └──────────────────► Dashboard / Analytics
```

All persistent records currently live in browser `localStorage`. The ledger is the authoritative source for inventory balance and valuation; those values should not be duplicated as mutable state.

For more detail, see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and [`docs/DESIGN_PLAN.md`](docs/DESIGN_PLAN.md).

## Tech stack

- React 18
- Vite 5
- Tailwind CSS 3
- Lucide React
- Vitest + Testing Library
- Playwright
- Browser `localStorage`

Exact versions are defined in `package.json` and `package-lock.json`.

## Getting started

### Requirements

- Node.js 18 or newer
- npm

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

### Build and preview

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

For Playwright Chromium, install the browser once when required:

```bash
npx playwright install chromium
```

### Verify mobile CSS

The repository includes a focused check for mobile stylesheet regressions:

```bash
npm run verify:mobile-css
```

## Testing approach

Unit and component tests are the primary fast feedback loop. They cover inventory calculations, linking behavior, the composed data hook, dialogs, and important view interactions.

Playwright tests cover browser-level workflows where real browser behavior matters. The suite should be run whenever a change affects a multi-screen workflow, persistence behavior, responsive behavior, or service-worker/PWA behavior.

A green unit test suite is not a substitute for checking the built application in a real browser. In particular, CSS loading and viewport behavior can fail in ways that `jsdom` does not reproduce.

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md) for the development workflow and [`CODING_STANDARDS.md`](CODING_STANDARDS.md) for project conventions.

In short:

1. Create a focused branch from `main`.
2. Understand the affected domain before changing behavior.
3. Keep business logic out of presentation components where practical.
4. Update tests and documentation with behavior changes.
5. Add comments only when they explain a non-obvious reason, invariant, compatibility requirement, or constraint.
6. Remove stale comments and documentation in the same change when they become inaccurate.
7. Run the relevant tests and production build before opening a pull request.
8. Keep pull requests small enough to review confidently.

## Data and privacy boundary

The application has no backend and does not require an account. Farm records are stored in the browser's local storage on the current device. There is currently no built-in cloud backup or multi-device synchronization.

Do not commit exported farm data, credentials, `.env` files, browser storage dumps, or other user data to the repository.

## Known limitations

These are intentional current boundaries unless future product work explicitly changes them:

- Single user, single device, single farm.
- Browser-local persistence only; no cloud backup or sync.
- English UI only.
- Direct farm-group costs only; shared overhead allocation is not modeled.
- Some rate metrics use current headcount because historical headcount movement is not yet modeled.
- Client-side validation only.
- No audited accounting, tax, or financial-reporting workflow.

## Future direction

Potential future work includes file-based export/import for backup, a properly validated Kiswahili translation, and—only if real usage demonstrates the need—opt-in multi-device synchronization that preserves offline-first behavior.

Any future network feature must remain optional and must never make local record creation dependent on connectivity.

## License

No open-source license is currently declared. Unless the repository owner adds one, treat the code as all-rights-reserved.
