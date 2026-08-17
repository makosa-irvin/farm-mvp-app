// Pure inventory-ledger math: constants, balance/cost calculations, and
// the general-purpose transaction normalizer used by manual ledger entries
// (purchase, wastage, transfer, stock count, etc.). Nothing here reads
// React state directly — inventory/transactions/expenses are always passed
// in explicitly, which is what makes this file testable without rendering
// anything.

export const INVENTORY_TRANSACTION_TYPES = [
  { value: 'purchase', label: 'Purchase / stock in', direction: 'in' },
  { value: 'consumption', label: 'Consumption / usage', direction: 'out' },
  { value: 'wastage', label: 'Wastage / spoilage', direction: 'out' },
  { value: 'return', label: 'Return to stock', direction: 'in' },
  { value: 'transfer', label: 'Transfer between units', direction: null },
  { value: 'adjustment_in', label: 'Adjustment increase', direction: 'in' },
  { value: 'adjustment_out', label: 'Adjustment decrease', direction: 'out' },
  { value: 'stock_count', label: 'Stock count adjustment', direction: null },
  { value: 'sale', label: 'Stock sale', direction: 'out' },
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

// Fills in direction/unit/cost/etc. for a transaction being created or
// edited manually (purchase, wastage, return, adjustment, sale, stock
// count — transfers are handled separately in inventoryActions.js, since
// they produce a paired out/in entry rather than one record).
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
    type: direction, // backwards-compatible alias
    direction,
    transactionType,
    quantity,
    unit: item.unit,
    unitCost,
    note,
    expenseId: transactionType === 'purchase' ? input.expenseId || null : null,
  };
}

// Whether a record moving stock OUT would exceed what's available. Returns
// a plain result rather than showing a toast itself, so callers (which
// know whether they're in a hook with access to showToast) decide how to
// surface it.
export function checkOutgoing(record, inventory, transactions) {
  if (record.direction !== 'out') return { ok: true };
  const available = getBalance(inventory, transactions, record.itemId, record.id || null);
  if (Number(record.quantity) > available + 1e-9) {
    const item = inventory.find((i) => i.id === record.itemId);
    return { ok: false, itemName: item?.name || 'stock', itemUnit: item?.unit || '', available };
  }
  return { ok: true };
}
