# Contributing to Mazaosmart

Thank you for contributing to Mazaosmart. This project is intentionally small and offline-first, so changes should favor clarity, predictable state transitions, and a low cognitive load for both users and maintainers.

## Before you start

Read these documents first:

- [`README.md`](README.md) — project overview, setup, architecture, and limitations
- [`CODING_STANDARDS.md`](CODING_STANDARDS.md) — JavaScript, React, domain, testing, and documentation conventions
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — state ownership and cross-domain data flow
- [`docs/DESIGN_PLAN.md`](docs/DESIGN_PLAN.md) — product constraints and longer-term direction

## Development workflow

### 1. Start from `main`

Create a focused branch from the latest `main` branch. Prefer names that describe the work, for example:

```text
feat/inventory-export
fix/negative-stock-validation
docs/update-contributing-guide
```

Avoid mixing unrelated cleanup, feature work, and behavior changes in one branch.

### 2. Understand the affected domain

Before changing a behavior, identify:

- The user-facing view in `src/views`.
- The state or action entry point in `src/hooks` or `src/lib/actions`.
- Any pure domain rules in `src/lib`.
- Existing tests covering the behavior.
- Any linked records that must remain synchronized.

For inventory-related work, read `src/lib/inventoryLedger.js` before changing balance, valuation, or transaction behavior.

### 3. Keep the architecture intact

The application has one persistent state boundary: `useFarmData`.

Do not introduce a second persistence mechanism or duplicate derived state unless there is a documented architectural reason. Prefer pure functions for calculations and synchronization rules so they can be tested independently of React.

### 4. Treat local storage as user data

Existing browser data must remain readable whenever possible. If a persisted data shape changes:

1. Preserve backward compatibility or add an explicit migration.
2. Keep the migration deterministic and safe to run more than once.
3. Document why the migration is required.
4. Add a regression test for existing data.

Never assume an empty `localStorage` when writing application code.

### 5. Write comments for maintainers, not for syntax

A good comment answers a question that the code itself cannot answer easily:

- Why is this rule required?
- Why is this apparently unusual implementation intentional?
- Which business invariant must not be broken?
- Why does this compatibility path exist?

Do not add comments that merely narrate the next line. Remove comments that describe code or behavior that no longer exists.

### 6. Test behavior at the lowest useful level

Use the lowest test layer that gives meaningful coverage:

- Pure calculation or normalization → unit test.
- Cross-domain state behavior → hook/action test.
- View rendering and stable controls → component smoke test.
- Multi-screen or real-browser behavior → Playwright E2E test.

When fixing a bug, prefer a regression test that fails against the old behavior.

### 7. Validate locally

At minimum, run:

```bash
npm test
npm run build
```

For relevant changes, also run:

```bash
npm run verify:mobile-css
npm run test:e2e
```

If Playwright is not installed locally:

```bash
npx playwright install chromium
```

Also load the production build in a real browser after changes that affect CSS, responsive layouts, PWA behavior, persistence, or browser APIs.

## Pull requests

A pull request should make review easy. Include:

- **What changed** — the user or developer-facing result.
- **Why** — the problem or requirement being addressed.
- **How it was implemented** — especially important when state synchronization or persistence is involved.
- **Validation** — commands run and any known limitations.
- **Documentation impact** — note README, architecture, or standards changes when applicable.

Keep the PR focused. If you discover unrelated cleanup, open a separate issue or follow-up branch unless the cleanup is necessary to make the current change safe.

## Review checklist

Before requesting review, confirm:

- [ ] The branch is based on the latest practical `main`.
- [ ] The change preserves the offline-first requirement.
- [ ] Persistent data remains compatible or has a documented migration.
- [ ] Business logic remains outside presentation components where practical.
- [ ] Related records remain synchronized after create, update, and delete operations.
- [ ] Tests cover new or changed business rules.
- [ ] Obsolete comments and documentation have been removed or corrected.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] Relevant E2E and mobile/browser checks have been run.
- [ ] No secrets, credentials, generated build output, or user data are included.

## Commit messages

Use concise imperative commit messages that describe the change:

```text
feat: add inventory export
fix: prevent stock count from creating negative balance
docs: clarify local storage migration rules
test: cover linked expense deletion
refactor: extract inventory cost calculation
```

Avoid messages such as `updates`, `changes`, or `fix stuff` because they provide little value when reading project history.

## Scope discipline

This project values maintainability over abstraction for its own sake. Do not introduce a new framework, state library, or dependency merely to avoid a small amount of straightforward code.

If a change would alter the application's offline model, persistence model, domain boundaries, or user terminology, document the decision and discuss it in the pull request before expanding the scope.
