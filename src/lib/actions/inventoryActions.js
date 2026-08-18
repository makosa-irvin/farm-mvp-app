// Inventory item CRUD, plus the general-purpose manual ledger form
// (purchase/wastage/return/transfer/adjustment/sale/stock-count). This is
// distinct from the automatic sync in expenseActions.js and logActions.js
// — those create transactions as a side effect of something else being
// saved; the functions here are the direct "record a transaction" path
// used by InventoryView's own ledger form.
import { fmtNum } from '../helpers.js';
import { getBalance, getWeightedAverageCost, normalizeTransaction, checkOutgoing } from '../inventoryLedger.js';

// Inventory actions are the stateful boundary around the pure ledger rules.
// They validate transactions, persist the result, and surface user feedback;
// the balance and valuation calculations themselves stay in inventoryLedger.
export function createInventoryActions({ inventory, transactions, expenses, setInventory, setInventoryTransactions, setExpenses, showToast, confirm }) {
  const addInventoryItem = (item) => {
    setInventory((prev) => [...prev, item]);
    showToast(`${item.name} added to inventory.`);
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
      if (!input.sourceUnitId || !input.destinationUnitId || input.sourceUnitId === input.destinationUnitId || qty <= 0) {
        showToast('A transfer needs a source unit, destination unit, and quantity.');
        return false;
      }
      const base = {
        itemId: input.itemId,
        quantity: qty,
        unitCost: Number(input.unitCost) || getWeightedAverageCost(inventory, transactions, input.itemId),
        date: input.date,
        note: input.note,
        source: 'manual',
        sourceId: null,
        createdAt: Date.now(),
      };
      const transferId = input.id || `transfer_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const available = getBalance(inventory, transactions, input.itemId);
      if (qty > available) {
        const item = inventory.find((i) => i.id === input.itemId);
        showToast(`Not enough ${item?.name || 'stock'} for this transfer. Available: ${fmtNum(available)} ${item?.unit || ''}.`);
        return false;
      }
      const out = { ...base, id: `${transferId}_out`, transactionType: 'transfer', direction: 'out', type: 'out', sourceUnitId: input.sourceUnitId, destinationUnitId: input.destinationUnitId, transferId };
      const incoming = { ...base, id: `${transferId}_in`, transactionType: 'transfer', direction: 'in', type: 'in', sourceUnitId: input.sourceUnitId, destinationUnitId: input.destinationUnitId, transferId };
      setInventoryTransactions((prev) => [...prev, out, incoming]);
      showToast(`Transferred ${fmtNum(qty)} ${base.unit || ''}.`);
      return out;
    }

    const record = normalizeTransaction({ ...input, id: input.id }, { inventory, expenses, transactions });
    if (!record) return false;
    if (!record.quantity && record.transactionType !== 'stock_count') return false;
    const check = checkOutgoing(record, inventory, transactions);
    if (!check.ok) {
      showToast(`Not enough ${check.itemName}. Available: ${fmtNum(check.available)} ${check.itemUnit}.`);
      return false;
    }
    const finalRecord = { ...record, id: record.id || `txn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`, createdAt: record.createdAt || Date.now() };
    setInventoryTransactions((prev) => [...prev, finalRecord]);
    showToast(`${finalRecord.transactionType.replaceAll('_', ' ')} recorded: ${fmtNum(finalRecord.quantity)} ${finalRecord.unit}.`);
    return finalRecord;
  };

  const updateInventoryTransaction = (input) => {
    const previous = transactions.find((t) => t.id === input.id);
    if (!previous) return false;

    if (input.transactionType === 'transfer' && previous.transferId) {
      const transferId = previous.transferId;
      const qty = Number(input.quantity) || 0;
      if (!input.sourceUnitId || !input.destinationUnitId || input.sourceUnitId === input.destinationUnitId || qty <= 0) {
        showToast('A transfer needs a source unit, destination unit, and quantity.');
        return false;
      }
      const withoutPair = transactions.filter((t) => t.transferId !== transferId);
      if (qty > getBalance(inventory, withoutPair, input.itemId)) {
        const item = inventory.find((i) => i.id === input.itemId);
        showToast(`Not enough ${item?.name || 'stock'} for this transfer.`);
        return false;
      }
      const cost = getWeightedAverageCost(inventory, withoutPair, input.itemId);
      const out = { ...input, id: `${transferId}_out`, transferId, direction: 'out', type: 'out', unitCost: cost };
      const incoming = { ...input, id: `${transferId}_in`, transferId, direction: 'in', type: 'in', unitCost: cost };
      setInventoryTransactions((prev) => [...prev.filter((t) => t.transferId !== transferId), out, incoming]);
      showToast('Transfer updated.');
      return true;
    }

    const withoutCurrent = transactions.filter((t) => t.id !== input.id);
    const record = normalizeTransaction(input, { inventory, expenses, transactions: withoutCurrent });
    if (!record) return false;
    if (!record.quantity && record.transactionType !== 'stock_count') return false;
    const check = checkOutgoing(record, inventory, withoutCurrent);
    if (!check.ok) {
      showToast(`Not enough ${check.itemName}. Available: ${fmtNum(check.available)} ${check.itemUnit}.`);
      return false;
    }
    setInventoryTransactions((prev) => prev.map((t) => (t.id === input.id ? { ...record, id: input.id, createdAt: previous.createdAt || Date.now() } : t)));
    showToast('Inventory transaction updated.');
    return true;
  };

  const removeInventoryTransaction = async (id) => {
    const target = transactions.find((t) => t.id === id);
    const message = target?.transferId
      ? 'Remove this transfer? Both sides will be removed.'
      : 'Remove this update? Your stock total will be recalculated.';
    if (!(await confirm(message))) return false;
    setInventoryTransactions((prev) => (target?.transferId ? prev.filter((t) => t.transferId !== target.transferId) : prev.filter((t) => t.id !== id)));
    showToast('Update removed.');
    return true;
  };

  return { addInventoryItem, updateInventoryItem, removeInventoryItem, addInventoryTransaction, updateInventoryTransaction, removeInventoryTransaction };
}
