# Coding Standards

These conventions keep Mazaosmart predictable to maintain and safe to change. They are intentionally practical: prefer simple code, explicit domain rules, and tests that protect user data.

## 1. General principles

- Prefer simple, explicit code over clever abstractions.
- Keep functions small enough that their purpose is clear from the name and inputs.
- Use early returns for invalid or exceptional cases instead of deeply nested conditionals.
- Keep business rules out of views when the rule can live in a reusable domain function.
- Do not create a second mutable source of truth for values that can be derived.
- Preserve existing behavior unless the change is intentional and documented.

## 2. JavaScript and JSX

- Use ES modules with `import` / `export`.
- Use `const` by default; use `let` only when reassignment is required.
- Use strict equality (`===`).
- Convert form and `localStorage` values explicitly before numeric calculations.
- Use optional chaining and nullish coalescing when they make missing values explicit.
- Do not mix `??` and `||` without parentheses. Make the intended precedence explicit.
- Prefer named exported domain functions with descriptive parameters.
- Keep JSX readable. Extract complex expressions into variables, helpers, or components.
- Avoid putting business calculations directly in JSX.

## 3. React components

- Components primarily render UI, manage local UI state, and respond to user interaction.
- Keep cross-feature business rules out of presentational components.
- Pass data and callbacks through props rather than reaching into unrelated application state.
- Put reusable UI pieces in `src/components`.
- Put complete feature screens in `src/views`.
- Keep persistent application state centralized in `useFarmData`.
- Do not introduce another global state mechanism for a problem already solved by the existing architecture.

## 4. Application state and persistence

`src/hooks/useFarmData.js` is the persistent application-state boundary.

- Add persistent state there unless there is a documented architectural reason not to.
- Action modules receive the state and setters they need; they should not create competing persistent state.
- Keep mutations predictable and immutable.
- Make cross-domain relationships explicit in an action or pure linking function.
- Calculate derived values from authoritative state rather than storing duplicate values.
- Treat existing `localStorage` data as user data. Preserve migration compatibility when changing keys or shapes.
- Document the reason for any persistence migration and add a regression test.

## 5. Domain logic

Pure domain logic belongs in `src/lib` whenever possible.

- `inventoryLedger.js` owns inventory normalization, balances, valuation, and inventory cost rules.
- `feedLinking.js` owns synchronization between daily logs and feed-consumption transactions.
- `expenseLinking.js` owns synchronization between inventory-linked expenses and purchase transactions.
- `src/lib/actions` owns domain CRUD and coordinates state changes.
- Pure functions receive their dependencies as arguments instead of reading React state or global mutable state.
- Pure functions should return data or results and should not display toasts or dialogs.

### Inventory invariants

- Balance is derived from opening stock plus signed ledger transactions.
- Outgoing transactions must not make available stock negative.
- Inventory-linked purchases derive unit cost from expense amount divided by purchased quantity.
- Outgoing stock uses weighted-average cost unless a specific domain rule says otherwise.
- Transfers use paired outgoing/incoming entries and must not create or destroy stock.
- Linked transactions need deterministic relationships so edits and deletes can safely update the originating record and its generated record.

## 6. Naming

Use names that communicate domain meaning.

Prefer:

```js
getWeightedAverageCost(itemId);
removeInventoryTransaction(id);
syncedTransactionsForExpense(expense, inventory, transactions);
```

Avoid vague names:

```js
handleData(data);
doThing(x);
processStuff(value);
```

Use established domain terminology consistently: `unit`, `log`, `expense`, `inventory`, `transaction`, `item`, `quantity`, `unitCost`, and `balance`.

## 7. Comments and documentation

Comments are maintenance code. A comment should explain something that would otherwise be difficult to infer.

### Good reasons to comment

- A business invariant is not obvious from the implementation.
- A compatibility or migration path exists for existing user data.
- A non-obvious cross-domain relationship must be preserved.
- A deliberate workaround is required because of a platform or browser constraint.
- A safety check exists to prevent a specific class of data corruption.

### Do not comment

- Obvious syntax or variable assignments.
- JSX that already explains itself.
- Temporary debugging information.
- Historical details that no longer affect the code.
- Old bug references that describe behavior no longer present.
- Promised behavior that the implementation does not provide.

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

When behavior changes, update or remove nearby comments in the same change.

## 8. Validation and user feedback

- Validate user-controlled numeric values before financial or inventory calculations.
- Reject invalid state transitions instead of silently creating inconsistent data.
- Use the existing toast mechanism for actionable user-facing validation errors.
- Keep UI notifications out of pure domain functions.
- Preserve form input when validation fails where practical.
- Use confirmation dialogs for destructive actions where the existing UX pattern requires them.

## 9. Tests

Test business rules at the lowest useful level.

- Pure functions → `tests/unit`.
- Cross-domain state behavior → hook/action tests.
- View rendering and stable controls → component smoke tests.
- Important multi-screen or browser-specific workflows → Playwright E2E tests.

When fixing a regression, add a test that would have failed against the old behavior.

Before a pull request, run at least:

```bash
npm test
npm run build
```

For relevant changes, also run:

```bash
npm run verify:mobile-css
npm run test:e2e
```

## 10. Accessibility and forms

- Give every form control an accessible, programmatically associated label.
- Prefer native semantic elements and meaningful button text.
- Use `htmlFor` / `id` associations for labels and controls.
- Preserve keyboard access when building custom controls.
- Do not remove accessible names or roles for styling convenience.
- Keep touch targets practical for phone use.

## 11. Styling

- Follow the existing Tailwind utility approach and CSS custom properties in `src/index.css`.
- Reuse existing design tokens and component patterns before adding one-off styles.
- Keep presentation concerns out of domain libraries.
- Do not introduce a new styling framework for a small isolated feature.
- After meaningful CSS changes, verify the production build in a real browser as well as through automated checks.

## 12. Dependencies

- Prefer existing dependencies when they solve the problem adequately.
- Add a dependency only when its value justifies the maintenance cost.
- Keep `package-lock.json` synchronized with `package.json`.
- Do not commit generated caches, build output, secrets, or local environment files.

## 13. Git and pull requests

- Keep commits focused and descriptive.
- Do not mix unrelated refactors with feature or bug-fix work.
- Update tests and documentation in the same change when behavior changes.
- Pull requests should explain what changed, why it changed, and how it was validated.
- Keep user-data and persistence changes especially explicit in the PR description.

## 14. Definition of done

A change is ready when:

1. The implementation follows the architecture and naming conventions.
2. Obsolete comments and documentation have been removed or corrected.
3. Relevant tests have been added or updated.
4. `npm test` passes.
5. `npm run build` passes.
6. Relevant E2E and browser checks pass when applicable.
7. README or architecture documentation is updated when setup, behavior, or structure changes.
8. No secrets, credentials, or user data are included.
