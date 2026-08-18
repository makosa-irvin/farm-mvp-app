// Inventory domain rules live here as pure functions. The ledger is the
// source of truth for stock balance and valuation; React state is supplied
// by callers rather than read directly, keeping these rules easy to test.

export const INVENTORY_TRANSACTION_TYPES = [
  { value: 'purchase', label: 'Bought stock', direction: 'in' },
  { value: 'consumption', label: 'Used it up', direction: 'out' },
  { value: 'wastage', label: 'Lost or spoiled', direction: 'out' },
  { value: 'return', label: 'Returned to stock', direction: 'in' },
  { value: 'transfer', label: 'Moved between units', direction: null },
  { value: 'adjustment_in', label: 'Found extra (correct the count up)', direction: 'in' },
  { value: 'adjustment_out', label: 'Missing some (correct the count down)', direction: 'out' },
  { value: 'stock_count', label: 'Counted what I actually have', direction: null },
  { value: 'sale', label: 'Sold', direction: 'out' },
];

export const directionFor = (type) =>
  INVENTORY_TRANSACTION_TYPES.find((t) => t.value === type)?.direction || 'in';

export function getExpenseUnitCost(expense) {
  if (!expense || !expense.inventoryQuantity) return null;
  const qty = Number(expense.inventoryQuantity);
  return qty > 0 ? Number(expense.amount) / qty : null;
}

export function getBalance(inventory, transactions, itemId, excludedTransactionId = null) {
  const item = inventory.find((i) => i.id === itemId);
  if (!item) return 0;
  return (
    (Number(item.openingStock) || 0) +
    transactions
      .filter((t) => t.itemId === itemId && t.id !== excludedTransactionId)
      .reduce((sum, t) => sum + (t.direction === 'in' ? Number(t.quantity) : -Number(t.quantity)), 0)
  );
}

export function getWeightedAverageCost(inventory, transactions, itemId) {
  const item = inventory.find((i) => i.id === itemId);
  if (!item) return 0;
  let qty = Number(item.openingStock) || 0;
  let value = qty * (Number(item.unitCost) || 0);
  for (const t of transactions.filter((t) => t.itemId === itemId && t.direction === 'in')) {
    const q = Number(t.quantity) || 0;
    qty += q;
    value += q * (Number(t.unitCost) || 0);
  }
  return qty > 0 ? value / qty : Number(item.unitCost) || 0;
}

// These are inventory deductions that represent a cost in the period.
// Transfers and sales are deliberately excluded: transfers are internal
// movements, while a sale should be paired with revenue/COGS accounting
// rather than treated as an operating expense.
export const isInventoryCostDeduction = (transaction) =>
  ['consumption', 'wastage', 'adjustment_out'].includes(transaction?.transactionType) &&
  transaction?.direction === 'out';

export const inventoryTransactionCost = (transaction) =>
  (Number(transaction?.quantity) || 0) * (Number(transaction?.unitCost) || 0);

// Manual transactions are normalized here so all ledger entries share the
// same direction, unit, quantity, and unit-cost rules before they are saved.
export function normalizeTransaction(input, { inventory, expenses, transactions }) {
  const item = inventory.find((i) => i.id === input.itemId);
  if (!item) return null;
  const transactionType = input.transactionType || (input.type === 'in' ? 'purchase' : 'consumption');
  let direction = directionFor(transactionType);
  let quantity = Number(input.quantity) || 0;
  let note = input.note?.trim() || '';

  if (transactionType === 'stock_count') {
    const target = Number(input.countQuantity);
    if (!Number.isFinite(target) || target < 0) return null;
    const current = getBalance(inventory, transactions, input.itemId, input.id || null);
    const delta = target - current;
    direction = delta >= 0 ? 'in' : 'out';
    quantity = Math.abs(delta);
    note = `${note ? note + ' — ' : ''}Stock count set balance to ${target} ${item.unit}`;
  }

  const expense = input.expenseId ? expenses.find((e) => e.id === input.expenseId) : null;
  const purchaseCost = transactionType === 'purchase' ? getExpenseUnitCost(expense) : null;
  const unitCost =
    purchaseCost ??
    (Number(
      input.unitCost ?? (direction === 'out' ? getWeightedAverageCost(inventory, transactions, input.itemId) : item.unitCost)
    ) || 0);

  return {
    ...input,
    type: direction,
    direction,
    transactionType,
    quantity,
    unit: item.unit,
    unitCost,
    note,
    expenseId: transactionType === 'purchase' ? input.expenseId || null : null,
  };
}

export function checkOutgoing(record, inventory, transactions) {
  if (record.direction !== 'out') return { ok: true };
  const available = getBalance(inventory, transactions, record.itemId, record.id || null);
  if (Number(record.quantity) > available + 1e-9) {
    const item = inventory.find((i) => i.id === record.itemId);
    return { ok: false, itemName: item?.name || 'stock', itemUnit: item?.unit || '', available };
  }
  return { ok: true };
}
