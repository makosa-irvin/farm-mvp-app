// Inventory item CRUD and manual ledger operations.
// The action layer coordinates inventory state with derived expense records;
// calculation and validation rules live in inventoryLedger.js.
import { fmtNum } from '../helpers.js';
import { getBalance, getWeightedAverageCost, normalizeTransaction, checkOutgoing, isInventoryCostDeduction, inventoryTransactionCost } from '../inventoryLedger.js';

function buildInventoryCostExpense(record, item) {
  const cost = inventoryTransactionCost(record);
  const isLoss = record.transactionType === 'wastage';
  return {
    id: `inv_cost_${record.id}`,
    category: item?.category?.toLowerCase() || 'supplies',
    amount: cost,
    date: record.date,
    unitId: record.unitId || null,
    description: record.note || `${isLoss ? 'Lost/spoiled' : 'Inventory deduction'}: ${fmtNum(record.quantity)} ${record.unit || item?.unit || ''} of ${item?.name || 'stock'}`,
    supplier: null,
    paymentMethod: null,
    inventoryItemId: record.itemId,
    inventoryQuantity: record.quantity,
    inventoryTransactionId: record.id,
    expenseType: isLoss ? 'inventory_loss' : 'inventory_deduction',
    nonCash: true,
    createdAt: Date.now(),
  };
}

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

    // Inventory deductions have economic cost but are not new cash payments.
    // Mirror them as non-cash expenses so reports include stock consumption,
    // losses, and write-offs without double-counting purchases.
    if (isInventoryCostDeduction(finalRecord) && !finalRecord.expenseId) {
      const item = inventory.find((i) => i.id === finalRecord.itemId);
      setExpenses((prev) => [...prev, buildInventoryCostExpense(finalRecord, item)]);
    }

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
    const updated = { ...record, id: input.id, createdAt: previous.createdAt || Date.now() };
    setInventoryTransactions((prev) => prev.map((t) => (t.id === input.id ? updated : t)));

    // Keep the derived non-cash expense synchronized with edited deductions.
    const generatedExpenseId = `inv_cost_${input.id}`;
    if (isInventoryCostDeduction(previous) || isInventoryCostDeduction(updated)) {
      const item = inventory.find((i) => i.id === updated.itemId);
      setExpenses((prev) => {
        const withoutGenerated = prev.filter((e) => e.id !== generatedExpenseId);
        return isInventoryCostDeduction(updated)
          ? [...withoutGenerated, buildInventoryCostExpense(updated, item)]
          : withoutGenerated;
      });
    }

    showToast('Inventory transaction updated.');
    return true;
  };

  const removeInventoryTransaction = async (id) => {
    const target = transactions.find((t) => t.id === id);
    const linkedExpense = target?.expenseId ? expenses.find((e) => e.id === target.expenseId) : null;
    const generatedExpense = target ? expenses.find((e) => e.inventoryTransactionId === target.id) : null;
    const message = target?.transferId
      ? 'Remove this transfer? Both sides will be removed.'
      : linkedExpense
        ? 'Remove this inventory-linked purchase? Remove the linked expense too?'
        : isInventoryCostDeduction(target)
          ? 'Remove this stock deduction? Its expense record will be removed too.'
          : 'Remove this update? Your stock total will be recalculated.';

    if (!(await confirm(message))) return false;

    setInventoryTransactions((prev) => (target?.transferId ? prev.filter((t) => t.transferId !== target.transferId) : prev.filter((t) => t.id !== id)));
    if (linkedExpense) setExpenses((prev) => prev.filter((e) => e.id !== linkedExpense.id));
    if (generatedExpense) setExpenses((prev) => prev.filter((e) => e.id !== generatedExpense.id));

    showToast('Inventory update removed.');
    return true;
  };

  return { addInventoryItem, updateInventoryItem, removeInventoryItem, addInventoryTransaction, updateInventoryTransaction, removeInventoryTransaction };
}
