# Coding Standards

This document defines the conventions for contributing to Field Ledger. The goal is predictable code, clear domain boundaries, and business logic that is easy to test.

## 1. General principles

- Prefer simple, explicit code over clever abstractions.
- Keep functions small enough that their purpose is obvious from their name and inputs.
- Use early returns for invalid or exceptional cases instead of deeply nested conditionals.
- Avoid duplicating business rules in views. Put reusable calculations and domain rules in `src/lib`.
- Do not introduce a second source of truth for data that can be derived from existing state.
- Preserve existing behavior unless a change is intentional and documented.

## 2. JavaScript and JSX

- Use modern ES modules and `import` / `export` syntax.
- Use `const` by default; use `let` only when reassignment is required.
- Prefer strict equality (`===`) and explicit numeric conversion when values originate from form fields or `localStorage`.
- Use optional chaining and nullish coalescing when they make missing values explicit.
- Do not mix `??` and `||` in one expression without parentheses. Group the intended precedence explicitly.
- Prefer named functions for exported domain operations and clear callback names for event handlers.
- Keep JSX readable. If a JSX expression becomes difficult to scan, extract it into a variable, helper, or component.
- Avoid inline business calculations in JSX when the calculation affects application behavior.

## 3. React components

- Components should primarily handle rendering, local UI state, and user interaction.
- Keep cross-feature business logic out of presentational components.
- Use props to pass data and callbacks; do not reach into unrelated state from a component.
- Keep reusable UI pieces in `src/components`.
- Keep complete feature screens in `src/views`.
- Follow React hook rules and keep persistent application state centralized in `useFarmData`.
- Do not add a new global state mechanism for a problem already handled by the existing hook/state architecture.

## 4. Application state and persistence

`src/hooks/useFarmData.js` owns the application's persistent state slices and composes the domain action modules.

- Add new persistent state here unless there is a strong architectural reason not to.
- Action modules receive the state and setters they need rather than creating their own persistent state.
- Keep state mutations predictable and immutable.
- When a change affects more than one domain, make the relationship explicit in an action or pure linking function.
- Do not silently update a derived value when it can be calculated from authoritative state.
- Preserve migration logic when changing localStorage keys or data shapes, and document the migration reason.

## 5. Domain and business logic

Pure domain logic belongs in `src/lib` whenever possible.

- `inventoryLedger.js` owns inventory transaction normalization, balance calculation, and weighted-average valuation.
- `feedLinking.js` owns synchronization between daily logs and feed-consumption transactions.
- `expenseLinking.js` owns synchronization between inventory-linked expenses and purchase transactions.
- `src/lib/actions` owns domain CRUD operations and coordinates state changes.
- Pure functions should receive their dependencies as arguments instead of reading React state or global mutable state directly.
- Return data or a result from pure functions; do not make them responsible for UI concerns such as displaying toasts.

### Inventory rules

- Inventory balance is derived from opening stock plus signed ledger transactions.
- Outgoing inventory must not make the balance negative.
- Purchases linked to expenses use the expense amount divided by the purchased quantity as unit cost.
- Outgoing stock uses weighted-average cost unless a more specific domain rule applies.
- Transfers are represented as paired outgoing/incoming entries and must not create or destroy stock.
- Linked transactions should have deterministic identifiers so the originating record can be edited or removed safely.

## 6. Naming

Use names that describe the domain meaning rather than implementation details.

Good examples:

```js
getWeightedAverageCost(itemId)
syncedTransactionsForExpense(expense, inventory, transactions)
removeInventoryTransaction(id)
```

Avoid vague names such as:

```js
handleData(data)
doThing(x)
processStuff(value)
```

Use established terminology consistently: `unit`, `log`, `expense`, `inventory`, `transaction`, `item`, `quantity`, `unitCost`, and `balance`.

## 7. Comments and documentation

Comments are part of the maintenance surface and must be treated as code.

### Write comments when they explain:

- Why an unusual implementation exists.
- A business invariant that is not obvious from the code.
- A compatibility or migration decision.
- A non-obvious relationship between domains.
- A deliberate limitation or workaround that future maintainers need to know.

### Do not write comments that:

- Restate the next line of code.
- Describe obvious variable names or JSX markup.
- Preserve obsolete debugging information.
- Refer to a previous coding pass, temporary fix, or historical conversation unless that history is still operationally relevant.
- Promise behavior that the implementation does not actually provide.

Prefer:

```js
// Exclude the current transaction so an edit is validated against the
// balance that would exist after replacing the old record.
const withoutCurrent = transactions.filter((t) => t.id !== input.id);
```

Avoid:

```js
// Filter transactions.
const withoutCurrent = transactions.filter((t) => t.id !== input.id);
```

When behavior changes, update nearby comments in the same change so they remain accurate.

## 8. Error handling and user feedback

- Validate user-controlled numeric values before applying them to inventory or financial calculations.
- Reject invalid state transitions rather than silently creating inconsistent data.
- Use the existing toast mechanism for actionable user-facing validation failures.
- Do not put UI notifications inside pure domain functions.
- Preserve user-entered form data when an operation fails validation.
- Use confirmation dialogs for destructive operations where the existing UI pattern calls for confirmation.

## 9. Tests

Every business-rule change should have a test at the lowest practical level.

- Put pure-function tests in `tests/unit`.
- Test cross-domain state behavior through `useFarmData.test.jsx` when multiple actions interact.
- Keep view smoke tests focused on rendering and stable user-facing controls.
- Use Playwright for important user journeys that cross multiple screens or depend on real browser behavior.
- Prefer assertions about user-visible behavior and domain outcomes over implementation details.
- When fixing a regression, add a test that would have failed before the fix.

Run the relevant checks before committing:

```bash
npm test
npm run build
npm run test:e2e
```

If Playwright browsers are not installed, run `npx playwright install chromium` once.

## 10. Accessibility and forms

- Every form control should have an accessible, programmatically associated label.
- Prefer native semantic elements and meaningful button text.
- Use `htmlFor`/`id` associations for labels and controls rather than relying only on visual proximity.
- Preserve keyboard usability when adding custom controls.
- Do not remove accessible names or roles merely to simplify styling.

## 11. Styling

- Follow the existing Tailwind utility approach and the CSS custom properties in `src/index.css`.
- Reuse existing design tokens and component patterns before introducing new one-off styles.
- Keep presentation concerns out of domain libraries.
- Avoid introducing a new styling framework for an isolated feature.

## 12. Dependencies

- Prefer the existing dependency set when it can solve the problem adequately.
- Add a dependency only when it provides meaningful value that would be expensive or error-prone to reproduce locally.
- Keep `package-lock.json` synchronized with `package.json`.
- Do not commit generated dependency caches or build output.

## 13. Git and pull requests

- Keep commits focused and descriptive.
- Do not mix unrelated refactors with a feature or bug fix.
- Update tests and documentation in the same change when behavior changes.
- Pull requests should explain what changed, why it changed, and how it was validated.
- Do not commit secrets, credentials, local environment files, or user data.

## 14. Definition of done

A change is ready when:

1. The implementation follows the architecture and naming conventions above.
2. Obsolete comments and documentation have been removed or corrected.
3. Relevant tests have been added or updated.
4. `npm test` passes.
5. `npm run build` passes.
6. Relevant end-to-end tests pass when user workflows changed.
7. README or other documentation is updated when the application's behavior, setup, or architecture changed.
