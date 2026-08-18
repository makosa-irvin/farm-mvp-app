// Inventory item CRUD, plus the general-purpose manual ledger form
// (purchase/wastage/return/transfer/adjustment/sale/stock-count).
import { fmtNum } from '../helpers.js';
import { getBalance, getWeightedAverageCost, normalizeTransaction, checkOutgoing, isInventoryCostDeduction, inventoryTransactionCost } from '../inventoryLedger.js';

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
    setInventoryTransactions((prev) => (prev.map((t) => (t.id === input.id ? { ...record, id: input.id, createdAt: previous.createdAt || Date.now() } : t))));
    showToast('Inventory transaction updated.');
    return true;
  };

  const removeInventoryTransaction = async (id) => {
    const target = transactions.find((t) => t.id === id);
    const linkedExpense = target?.expenseId ? expenses.find((e) => e.id === target.expenseId) : null;
    const isCostDeduction = isInventoryCostDeduction(target);
    const cost = inventoryTransactionCost(target);
    const message = target?.transferId
      ? 'Remove this transfer? Both sides will be removed.'
      : linkedExpense
        ? 'Remove this inventory-linked purchase? Remove the linked expense too?'
        : isCostDeduction
          ? `Remove this ${target?.transactionType === 'wastage' ? 'loss' : 'stock deduction'}? The inventory balance and expense record will be updated.`
          : 'Remove this update? Your stock total will be recalculated.';

    if (!(await confirm(message))) return false;

    setInventoryTransactions((prev) => (target?.transferId ? prev.filter((t) => t.transferId !== target.transferId) : prev.filter((t) => t.id !== id)));

    // Purchases entered from Expenses own their expense record, so deleting
    // the inventory purchase also removes that expense instead of leaving an
    // orphaned cash expense with no stock behind it.
    if (linkedExpense) {
      setExpenses((prev) => prev.filter((e) => e.id !== linkedExpense.id));
    }

    // A wastage/deduction is a non-cash cost: it reduces inventory value but
    // should still appear on Expenses so profit/cost reporting reflects what
    // was actually lost. It is recorded at the ledger's valuation cost.
    if (isCostDeduction && !target?.expenseId) {
      const item = inventory.find((i) => i.id === target.itemId);
      const lossExpense = {
        id: `inv_loss_${target.id}`,
        category: item?.category?.toLowerCase() || 'supplies',
        amount: cost,
        date: target.date,
        unitId: target.unitId || null,
        description: target.note || `${target.transactionType === 'wastage' ? 'Lost/spoiled' : 'Inventory deduction'}: ${fmtNum(target.quantity)} ${target.unit || item?.unit || ''} of ${item?.name || 'stock'}`,
        inventoryItemId: target.itemId,
        inventoryQuantity: target.quantity,
        inventoryTransactionId: target.id,
        expenseType: target.transactionType === 'wastage' ? 'inventory_loss' : 'inventory_deduction',
        nonCash: true,
        createdAt: Date.now(),
      };
      setExpenses((prev) => [...prev, lossExpense]);
    }

    showToast('Inventory update removed.');
    return true;
  };

  return { addInventoryItem, updateInventoryItem, removeInventoryItem, addInventoryTransaction, updateInventoryTransaction, removeInventoryTransaction };
}
