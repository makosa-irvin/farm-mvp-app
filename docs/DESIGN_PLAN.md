# Field Ledger — Design Plan

## 1. Product intent

Field Ledger is a mobile-first farm operations tracker for smallholder and small-commercial farms. The product is designed around a practical user who may have limited accounting experience, limited technical experience, and unreliable internet access.

The product should make common farm records quick to capture and should turn those records into useful operational information without requiring the user to understand accounting terminology.

## 2. Non-negotiable product constraints

### Offline first

Core workflows must work with zero connectivity. Connectivity may enable future backup, sharing, or synchronization features, but it must never become a prerequisite for saving a farm record.

### Plain language

User-facing labels should describe actions in terms a farmer can understand. Internal implementation terms such as `unit`, `transactionType`, `adjustment_out`, and weighted-average cost should not leak into the interface unless the concept is genuinely useful to the user.

### Small-screen usability

The application is designed primarily for phones. Forms should favor the common path over exhaustive option lists, maintain accessible touch targets, and avoid unnecessary information density.

### Data integrity

Inventory balance, inventory valuation, and cross-domain links are core correctness concerns. A change that improves UI behavior but can leave records out of sync is not an acceptable trade-off.

## 3. Current architecture

The current implementation is a pure client-side React application using browser `localStorage` for persistence. There is no backend, database, authentication, or cloud synchronization.

The architecture is intentionally split into:

- Presentation in `src/views`, `src/components`, and `src/layout`.
- Persistent state composition in `src/hooks/useFarmData.js`.
- Domain mutations in `src/lib/actions`.
- Pure calculations and linking rules in `src/lib`.
- Browser persistence in `src/lib/usePersistentState.js`.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the detailed boundaries and invariants.

## 4. Current product capabilities

The application currently supports:

- Farm groups for flocks, herds, plots, and similar production groups.
- Daily production logs, including feed use and mortality.
- Cash expenses with optional farm-group and inventory links.
- An inventory transaction ledger with purchases, consumption, wastage, returns, transfers, adjustments, stock counts, and sales.
- Weighted-average inventory valuation.
- Automatic synchronization between linked expenses, daily logs, and inventory transactions.
- Dashboard summaries and low-stock/loss visibility.
- Per-group and farm-level analytics.
- PWA installation and cached application-shell loading.

## 5. Product boundaries

The following are intentionally outside the current scope:

- Multi-user accounts.
- Multi-device synchronization.
- Cloud storage or automatic cloud backup.
- Full accounting, tax, or audited financial reporting.
- Shared overhead allocation across farm groups.
- Historical headcount modeling detailed enough for every possible rate calculation.
- A multilingual interface without an appropriate translation review process.

These boundaries should not be treated as defects unless product requirements change.

## 6. Planned improvements

The roadmap should be driven by actual user needs rather than by adding infrastructure for its own sake.

### Priority 1 — Data safety

- Add explicit export/import of farm data using files available to the user.
- Provide a clear recovery path if browser storage is cleared.
- Add validation and migration tests for persisted data shapes.

### Priority 2 — Language and accessibility

- Add a professionally reviewed Kiswahili translation.
- Continue improving accessible labels, keyboard behavior, contrast, and touch targets.
- Keep terminology consistent across Dashboard, Daily Log, Expenses, Stock, and Analytics.

### Priority 3 — Operational reporting

- Improve farm-level summaries where they answer concrete user questions.
- Consider printable/shareable summaries without requiring an online service.
- Keep reports understandable without accounting knowledge.

### Priority 4 — Optional synchronization

Only if real usage demonstrates a multi-device need, investigate opt-in synchronization.

Any synchronization design must preserve these requirements:

1. Local records remain usable when offline.
2. Saving a record never waits for a network response.
3. Conflicts are explicit and recoverable rather than silently overwriting data.
4. Farm data is not transmitted without clear user consent.
5. The existing domain functions remain reusable independently of the transport layer.

## 7. Release discipline

Before considering a significant release ready:

- Run the unit/component suite.
- Run the production build.
- Run relevant Playwright journeys.
- Run the mobile CSS verification when styling changes are involved.
- Load the production build in a real browser.
- Exercise core create/edit/delete flows with representative local data.
- Test core workflows with network access disabled.
- Verify that existing persisted data is still readable after schema-related changes.

A passing build is not proof that the application is correct. Browser behavior, CSS loading, persistence, and cross-domain synchronization need explicit validation.

## 8. Documentation policy

This document describes current product direction, not an issue tracker. Historical implementation notes belong in commit history or pull requests unless they explain a constraint that still affects current engineering decisions.

When the product or architecture changes, update this document and the README in the same change. Remove obsolete roadmap items rather than leaving completed work mixed with future work.
