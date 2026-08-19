// Inventory rules are pure functions. Callers provide state so the ledger can
// be tested independently of React and remains the source of truth for stock.

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

export const isInventoryCostDeduction = (transaction) =>
  ['consumption', 'wastage', 'adjustment_out'].includes(transaction?.transactionType) &&
  (transaction?.direction || transaction?.type) === 'out';

export const inventoryTransactionCost = (transaction) =>
  (Number(transaction?.quantity) || 0) * (Number(transaction?.unitCost) || 0);

// itemSnapshot is used only by the spreadsheet importer. It lets an import
// create an item and its ledger movements in one pass even though React state
// updates are asynchronous. Normal/manual transactions still resolve the item
// from the persisted inventory array.
export function normalizeTransaction(input, { inventory, expenses, transactions }) {
  const item = inventory.find((i) => i.id === input.itemId) || input.itemSnapshot;
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
  const fallbackCost = direction === 'out'
    ? getWeightedAverageCost(inventory, transactions, input.itemId)
    : item.unitCost;
  const unitCost = Number(purchaseCost ?? input.unitCost ?? fallbackCost) || 0;

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
