
## Inventory transaction ledger

Inventory is ledger-driven. `farm-inventory-ledger` stores transaction records and the current balance is derived from opening stock plus signed transactions.

Supported transaction types:
- Purchase / stock in
- Consumption / usage
- Wastage / spoilage
- Return to stock
- Transfer between production units (paired out/in entries)
- Adjustment increase/decrease
- Stock count adjustment
- Stock sale

Daily-log feed usage creates a linked `consumption` transaction. Editing or deleting the daily log updates/removes that linked transaction. Purchase transactions can link to an expense so the recorded expense amount divided by purchased quantity becomes the transaction's unit cost. Outgoing inventory is costed using weighted-average cost from incoming stock.

## Fixes applied in this pass

The form fields for linking an expense to an inventory item/quantity already existed, but nothing acted on them — recording a feed expense didn't move inventory at all; you had to separately go to the Inventory tab and manually record a matching purchase. That's now automatic:

- **`useFarmData.js`**: `addExpense`/`updateExpense` now call a new `syncExpensePurchaseTransaction`, which creates (or replaces, on edit) a linked `purchase` transaction with a deterministic id (`exppurchase_<expenseId>`) — the same pattern already used for daily-log-driven consumption (`logfeed_<logId>`). `removeExpense` removes the linked transaction too.
- **Safety guard**: reducing a purchase's quantity on edit, or deleting the expense outright, is rejected with a toast if doing so would drive that item's stock negative (i.e., some of it has already been consumed elsewhere). Adding a new purchase can never trigger this, since it only adds supply.
- **`ExpensesView.jsx`**: the form used to reset unconditionally after save, which would have silently discarded the "can't save" case above along with the user's input. It now only resets on a confirmed success, matching the pattern already used in `DailyLogView.jsx`/`UnitsView.jsx`. The quantity field is also now required once an inventory item is selected, since leaving it blank previously created a link that silently did nothing.
- **`InventoryView.jsx`**: the manual "link to a purchase expense" dropdown now excludes expenses that already have an auto-created transaction, so the same purchase can't be counted twice.
- **`DailyLogView.jsx`**: the feed-item picker was showing `openingStock` as if it were current stock, ignoring every transaction since. It now shows the real, ledger-derived balance.
- **`helpers.js`**: `unitMetrics`'s cost-per-unit calculation only counted feed cost from consumption transactions created via the daily-log form, silently ignoring any consumption recorded manually through the Inventory tab. Broadened to count any `consumption`-type transaction attributed to the unit.
- **Pre-existing syntax bug**: `normalizeTransaction` mixed `??` and `||` without parentheses (`purchaseCost ?? Number(...) || 0`), which is invalid JavaScript — this would have failed to build at all, unrelated to any of the above. Fixed with explicit grouping.
- **Dead code**: `updateInventoryTransaction`'s transfer-editing logic was duplicated verbatim; the first copy returned early, making the second (better-written, with a proper item-name error message) unreachable. Removed the duplicate.

Verified by rendering the actual hook in a real React + JSDOM environment (not a reimplementation) through a full sequence: add expense → balance increases → log consumption → balance decreases → cost-per-unit reflects only what was actually consumed → edit-down-below-consumed is rejected → edit-up succeeds → delete-while-in-use is rejected → delete-once-safe succeeds and fully removes the linked transaction.

## File structure

`useFarmData.js` was one 314-line file mixing five `usePersistentState` slices, general CRUD, and the cross-domain sync logic above. It's now a ~80-line composition layer over:

```
src/lib/
  inventoryLedger.js        — pure balance/cost math + the general transaction normalizer (no React, no closures — inventory/transactions/expenses are always passed in explicitly, so this file can be unit-tested with plain arrays)
  feedLinking.js              — daily-log ↔ consumption-transaction sync (pure)
  expenseLinking.js            — expense ↔ purchase-transaction sync (pure) — the fix from the previous pass, now isolated
  actions/
    unitActions.js               — addUnit/updateUnit/removeUnit (cascade into logs/expenses/transactions)
    logActions.js                  — addLog/updateLog/removeLog (calls feedLinking.js)
    expenseActions.js               — addExpense/updateExpense/removeExpense (calls expenseLinking.js)
    inventoryActions.js              — inventory item CRUD + the general manual ledger form (purchase/wastage/transfer/stock-count/etc, distinct from the automatic expense/log-driven sync)
src/hooks/
  useFarmData.js              — owns the five usePersistentState slices, composes the action modules above, returns the same public API as before
```

The split follows one rule: **state stays together, logic moves out**. All five `usePersistentState` calls stay in `useFarmData.js`, since the cross-domain effects (a log consuming feed, an expense creating a purchase, a deleted unit cascading everywhere) all need multiple pieces of state at once — trying to split those into fully independent hooks would just recreate the coupling one level up, with extra indirection. What actually moved out is the *math and CRUD logic*, as plain functions that take the state they need as arguments instead of reading it from a closure. That's what makes `inventoryLedger.js`, `feedLinking.js`, and `expenseLinking.js` directly unit-testable with plain arrays — no React, no JSDOM, no rendering required.

Nothing outside `useFarmData.js` changed — `App.jsx` and every view still call `farm.addExpense(...)`, `farm.getBalance(id)`, etc. exactly as before. Re-verified with the same JSDOM test as above, plus new checks covering the manual ledger form, transfers, and the unit-delete cascade (25/25 passing).

