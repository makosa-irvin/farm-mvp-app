# Architecture

## Purpose

Field Ledger is a client-side React application designed around three constraints:

1. Farm records must remain usable without internet access.
2. Inventory, expense, and production records must stay internally consistent.
3. Domain calculations should be testable without rendering the application.

The architecture therefore separates persistent application state, domain mutations, pure domain rules, and presentation.

## High-level layers

```text
┌─────────────────────────────────────────────┐
│ Views / Components                          │
│ User interaction and presentation           │
└──────────────────────┬──────────────────────┘
                       │ props + callbacks
┌──────────────────────▼──────────────────────┐
│ useFarmData                                  │
│ Persistent state boundary + action facade    │
└──────────────────────┬──────────────────────┘
                       │ state + setters
┌──────────────────────▼──────────────────────┐
│ src/lib/actions                             │
│ Domain mutations and cross-domain updates    │
└──────────────────────┬──────────────────────┘
                       │ pure rules
┌──────────────────────▼──────────────────────┐
│ src/lib                                    │
│ Ledger, linking, calculations, helpers       │
└──────────────────────┬──────────────────────┘
                       │ persistence
┌──────────────────────▼──────────────────────┐
│ localStorage                               │
│ Browser-local persistence only               │
└─────────────────────────────────────────────┘
```

## State ownership

`src/hooks/useFarmData.js` is the application's persistent state boundary. It owns the following state slices:

- `units`
- `logs`
- `expenses`
- `inventory`
- `transactions`

The hook composes action factories and exposes a stable application-facing API to views.

Views should not independently persist these records. A new persistent state mechanism should only be introduced after an explicit architecture decision.

## Domain modules

### Inventory ledger

`src/lib/inventoryLedger.js` contains pure inventory rules:

- Transaction type and direction handling.
- Transaction normalization.
- Inventory balance calculation.
- Weighted-average cost calculation.
- Outgoing-stock validation.
- Identification and valuation of inventory cost deductions.

The ledger is authoritative for stock balance. Do not store a second mutable balance that can diverge from the transaction history.

### Feed linking

`src/lib/feedLinking.js` connects daily production logs to inventory consumption. The relationship must remain deterministic so a log can be edited or deleted without leaving an orphaned inventory transaction.

### Expense linking

`src/lib/expenseLinking.js` connects inventory-linked expenses to purchase transactions. Purchase unit cost is derived from the expense amount and purchased quantity.

### Action modules

`src/lib/actions` coordinates state mutations. Action modules are the appropriate place to handle operations that affect multiple state slices or require user confirmation/toasts.

Pure calculation functions should remain independent of UI concerns.

## Cross-domain invariants

The following invariants are especially important:

### Inventory balance

```text
balance = opening stock + signed ledger transactions
```

A transaction update must validate against the balance that would exist after replacing the old transaction, not against a balance that still includes the old record.

### Weighted-average cost

Incoming stock contributes quantity and value to the running inventory valuation. Outgoing stock uses the resulting weighted-average unit cost unless a more specific rule applies.

### Transfers

A transfer is represented by an outgoing entry from the source group and an incoming entry for the destination group. A transfer must not create or destroy stock at the farm level.

### Linked records

When one record owns a generated or linked record, create, update, and delete operations must preserve that relationship. The originating record is the source of truth; generated records should not become independently editable in a way that can break synchronization.

### Non-cash inventory costs

Consumption, wastage, and downward adjustments can represent real farm costs even though they are not cash payments. These costs may be surfaced as synthetic expense records while the underlying inventory transaction remains authoritative.

## Persistence and migrations

Persistent keys currently include:

```text
farm-units
farm-logs
farm-expenses
farm-inventory
farm-inventory-ledger
```

`useFarmData` retains compatibility with the legacy `farm-inventory-movements` key. Existing legacy movements are normalized into the current ledger representation when read.

If a persisted schema changes, treat the existing browser data as production data. Do not silently discard it or require users to start over.

## UI boundaries

- `src/views` contains complete feature screens.
- `src/components` contains reusable UI pieces.
- `src/layout` contains application-shell concerns such as navigation.
- `src/hooks` contains React-specific state composition.
- `src/lib` contains domain rules and non-UI utilities.

A component should not become a convenient dumping ground for calculations merely because it has access to the required data.

## Offline-first requirement

There is currently no backend, so the application naturally operates without connectivity. This behavior is a product requirement and must remain true if networking is introduced later.

Future network features must follow these rules:

- Local writes remain the critical path for saving records.
- Connectivity failures must not block core farm workflows.
- Any data leaving the device must be explicit and opt-in.
- Synchronization must be additive to local persistence, not a replacement for it.

## Testing architecture

Pure domain functions should be tested directly. Cross-domain state behavior should be tested through the action/hook layer. Views should be tested for user-visible behavior and stable controls. Playwright should cover workflows that depend on real browser behavior.

The goal is not maximum test count. The goal is coverage of the invariants that would cause data loss, incorrect stock, incorrect costs, or broken core workflows if violated.
