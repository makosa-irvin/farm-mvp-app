// An expense linked to an inventory item represents a stock purchase.
// These pure functions calculate the corresponding ledger entry and enforce
// the rule that changing/removing a purchase cannot make stock negative.

import { getBalance, getExpenseUnitCost } from './inventoryLedger.js';

export function expensePurchaseTransactionId(expenseId) {
  return `exppurchase_${expenseId}`;
}

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

// Return both the linked purchase and the resulting balance so the action
// layer can reject unsafe deletion without mutating state first.
export function balanceIfExpensePurchaseRemoved(expenseId, inventory, transactions) {
  const linkedTx = transactions.find((t) => t.source === 'expense-purchase' && t.sourceId === expenseId);
  if (!linkedTx) return { linkedTx: null, balance: null };
  const withoutThis = transactions.filter((t) => t.id !== linkedTx.id);
  return { linkedTx, balance: getBalance(inventory, withoutThis, linkedTx.itemId) };
}
