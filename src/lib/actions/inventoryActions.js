// Inventory item CRUD and manual ledger operations.
import { fmtNum } from '../helpers.js';
import {
  getBalance,
  getWeightedAverageCost,
  normalizeTransaction,
  checkOutgoing,
  isInventoryCostDeduction,
  inventoryTransactionCost,
} from '../inventoryLedger.js';
function buildInventoryCostExpense(record, item) {
  return {
    id: `inv_cost_${record.id}`,
    category: item?.category?.toLowerCase() || 'supplies',
    amount: inventoryTransactionCost(record),
    date: record.date,
    unitId: record.unitId || null,
    description:
      record.note || `Inventory deduction: ${fmtNum(record.quantity)} ${record.unit || item?.unit || ''} of ${item?.name || 'stock'}`,
    supplier: null,
    paymentMethod: null,
    inventoryItemId: record.itemId,
    inventoryQuantity: record.quantity,
    inventoryTransactionId: record.id,
    expenseType: record.transactionType === 'wastage' ? 'inventory_loss' : 'inventory_deduction',
    nonCash: true,
    createdAt: Date.now(),
  };
}
export function createInventoryActions({
  inventory,
  transactions,
  expenses,
  setInventory,
  setInventoryTransactions,
  setExpenses,
  showToast,
  confirm,
}) {
  const addInventoryItem = (item) => {
    const opening = Number(item.openingStock) || 0;
    const savedItem = item.openingDate && opening > 0 ? { ...item, openingStock: 0 } : item;
    setInventory((prev) => [...prev, savedItem]);
    if (item.openingDate && opening > 0)
      setInventoryTransactions((prev) => [
        ...prev,
        {
          id: `import_opening_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          itemId: savedItem.id,
          transactionType: 'purchase',
          direction: 'in',
          type: 'in',
          quantity: opening,
          unit: savedItem.unit,
          unitCost: Number(savedItem.unitCost) || 0,
          date: item.openingDate,
          note: 'Imported opening stock',
          source: 'import',
          sourceId: savedItem.id,
          createdAt: Date.now(),
        },
      ]);
    showToast(`${savedItem.name} added to inventory.`);
    return savedItem;
  };
  const updateInventoryItem = (item) => {
    setInventory((prev) => prev.map((x) => (x.id === item.id ? item : x)));
    showToast(`${item.name} updated.`);
  };
  const removeInventoryItem = async (id) => {
    const item = inventory.find((i) => i.id === id);
    if (!(await confirm(`Remove ${item?.name || 'this item'}? Its history will be removed too.`))) return;
    setInventory((prev) => prev.filter((i) => i.id !== id));
    setInventoryTransactions((prev) => prev.filter((t) => t.itemId !== id));
    setExpenses((prev) => prev.map((e) => (e.inventoryItemId === id ? { ...e, inventoryItemId: null, inventoryQuantity: null } : e)));
    showToast('Item removed.');
  };
  const addInventoryTransaction = (input) => {
    if (input.transactionType === 'transfer') {
      const qty = Number(input.quantity) || 0;
      if (!input.sourceUnitId || !input.destinationUnitId || input.sourceUnitId === input.destinationUnitId || qty <= 0) return false;
      const available = getBalance(inventory, transactions, input.itemId);
      if (qty > available) return false;
      const transferId = input.id || `transfer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        cost = Number(input.unitCost) || getWeightedAverageCost(inventory, transactions, input.itemId),
        base = {
          itemId: input.itemId,
          quantity: qty,
          unitCost: cost,
          unit: input.unit,
          date: input.date,
          note: input.note,
          source: input.source || 'manual',
          sourceId: input.sourceId || null,
          createdAt: Date.now(),
        };
      const out = {
          ...base,
          id: `${transferId}_out`,
          transactionType: 'transfer',
          direction: 'out',
          type: 'out',
          sourceUnitId: input.sourceUnitId,
          destinationUnitId: input.destinationUnitId,
          transferId,
        },
        incoming = {
          ...base,
          id: `${transferId}_in`,
          transactionType: 'transfer',
          direction: 'in',
          type: 'in',
          sourceUnitId: input.sourceUnitId,
          destinationUnitId: input.destinationUnitId,
          transferId,
        };
      setInventoryTransactions((prev) => [...prev, out, incoming]);
      return out;
    }
    const itemSnapshot = input.itemSnapshot || inventory.find((i) => i.id === input.itemId),
      record = normalizeTransaction({ ...input, id: input.id }, { inventory, expenses, transactions });
    if (!record || (!record.quantity && record.transactionType !== 'stock_count')) return false;
    const validationInventory = itemSnapshot && !inventory.some((i) => i.id === record.itemId) ? [...inventory, itemSnapshot] : inventory;
    if (input.source !== 'import' && !checkOutgoing(record, validationInventory, transactions).ok) return false;
    const finalRecord = {
      ...record,
      id: record.id || `txn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: record.createdAt || Date.now(),
    };
    setInventoryTransactions((prev) => [...prev, finalRecord]);
    if (isInventoryCostDeduction(finalRecord) && !finalRecord.expenseId)
      setExpenses((prev) => [...prev, buildInventoryCostExpense(finalRecord, itemSnapshot)]);
    return finalRecord;
  };
  const updateInventoryTransaction = (input) => {
    const previous = transactions.find((t) => t.id === input.id);
    if (!previous) return false;
    const withoutCurrent = transactions.filter((t) => t.id !== input.id),
      record = normalizeTransaction(input, { inventory, expenses, transactions: withoutCurrent });
    if (!record || (!record.quantity && record.transactionType !== 'stock_count') || !checkOutgoing(record, inventory, withoutCurrent).ok)
      return false;
    setInventoryTransactions((prev) =>
      prev.map((t) => (t.id === input.id ? { ...record, id: input.id, createdAt: previous.createdAt || Date.now() } : t)),
    );
    return true;
  };
  const removeInventoryTransaction = async (id) => {
    const target = transactions.find((t) => t.id === id);
    if (
      !(await confirm(
        target?.transferId
          ? 'Remove this transfer? Both sides will be removed.'
          : 'Remove this stock update? Your stock total will be recalculated.',
      ))
    )
      return false;
    setInventoryTransactions((prev) =>
      target?.transferId ? prev.filter((t) => t.transferId !== target.transferId) : prev.filter((t) => t.id !== id),
    );
    setExpenses((prev) => prev.filter((e) => e.inventoryTransactionId !== id));
    return true;
  };
  return {
    addInventoryItem,
    updateInventoryItem,
    removeInventoryItem,
    addInventoryTransaction,
    updateInventoryTransaction,
    removeInventoryTransaction,
  };
}
