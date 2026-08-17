// Cross-domain linking between expenses and the inventory ledger: an
// expense with an inventoryItemId + inventoryQuantity represents a stock
// purchase, and should move stock the moment the expense is saved. Pure
// functions — the hook calls setState with the results.

import { getBalance, getExpenseUnitCost } from './inventoryLedger.js';

export function expensePurchaseTransactionId(expenseId) {
  return `exppurchase_${expenseId}`;
}

// Computes the transactions array that should result from saving this
// expense, or null if applying it would drive stock negative (only
// possible on edit, when reducing a purchase's quantity after some of it
// has already been consumed elsewhere) — the caller shows an error and
// aborts in that case rather than applying a bad state.
export function syncedTransactionsForExpense(expense, inventory, transactions) {
  const withoutCurrent = transactions.filter((t) => !(t.source === 'expense-purchase' && t.sourceId === expense.id));
  const item = inventory.find((i) => i.id === expense.inventoryItemId);
  const qty = Number(expense.inventoryQuantity);
  const hasLink = Boolean(expense.inventoryItemId) && qty > 0 && Boolean(item);

  if (!hasLink) return withoutCurrent;

  const existing = transactions.find((t) => t.source === 'expense-purchase' && t.sourceId === expense.id);
  const movement = {
    id: expensePurchaseTransactionId(expense.id),
    itemId: expense.inventoryItemId,
    transactionType: 'purchase',
    direction: 'in',
    type: 'in',
    quantity: qty,
    unit: item.unit,
    unitCost: getExpenseUnitCost(expense) ?? 0,
    date: expense.date,
    note: expense.description?.trim() || 'Purchase recorded via expense',
    source: 'expense-purchase',
    sourceId: expense.id,
    expenseId: expense.id,
    unitId: null,
    createdAt: existing?.createdAt || Date.now(),
  };

  const projected = [...withoutCurrent, movement];
  const projectedBalance = getBalance(inventory, projected, expense.inventoryItemId);
  if (projectedBalance < -1e-9) return null;

  return projected;
}

// Whether it's safe to fully remove an expense's linked purchase, and what
// the resulting balance would be either way.
export function balanceIfExpensePurchaseRemoved(expenseId, inventory, transactions) {
  const linkedTx = transactions.find((t) => t.source === 'expense-purchase' && t.sourceId === expenseId);
  if (!linkedTx) return { linkedTx: null, balance: null };
  const withoutThis = transactions.filter((t) => t.id !== linkedTx.id);
  return { linkedTx, balance: getBalance(inventory, withoutThis, linkedTx.itemId) };
}
