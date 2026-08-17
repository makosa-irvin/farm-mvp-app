import { fmtNum } from '../helpers.js';
import { syncedTransactionsForExpense, balanceIfExpensePurchaseRemoved } from '../expenseLinking.js';

export function createExpenseActions({ inventory, transactions, setExpenses, setInventoryTransactions, showToast }) {
  // The fix from the previous pass: an expense linked to an inventory item
  // now actually moves stock, instead of the link just sitting there.
  const syncExpensePurchaseTransaction = (expense) => {
    const result = syncedTransactionsForExpense(expense, inventory, transactions);
    if (result === null) {
      const item = inventory.find((i) => i.id === expense.inventoryItemId);
      showToast(`Can't save — some of the ${item?.name || 'item'} from this purchase has already been used elsewhere.`);
      return false;
    }
    setInventoryTransactions(result);
    return true;
  };

  const addExpense = (expense) => {
    setExpenses((prev) => [...prev, expense]);
    syncExpensePurchaseTransaction(expense); // can't fail on a fresh add — it only ever adds supply
    showToast(`${expense.amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} expense logged.`);
    return true;
  };

  const updateExpense = (expense) => {
    if (!syncExpensePurchaseTransaction(expense)) return false;
    setExpenses((prev) => prev.map((x) => (x.id === expense.id ? expense : x)));
    showToast('Expense updated.');
    return true;
  };

  const removeExpense = (id) => {
    const { linkedTx, balance } = balanceIfExpensePurchaseRemoved(id, inventory, transactions);
    if (linkedTx && balance < -1e-9) {
      const item = inventory.find((i) => i.id === linkedTx.itemId);
      showToast(`Can't delete — ${fmtNum(Math.abs(balance))} ${item?.unit || ''} of ${item?.name || 'this item'} from this purchase has already been used elsewhere.`);
      return;
    }
    if (!window.confirm(linkedTx ? 'Delete this expense? Its linked inventory purchase will also be removed, reducing stock back down.' : 'Delete this expense?')) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (linkedTx) setInventoryTransactions((prev) => prev.filter((t) => t.id !== linkedTx.id));
    showToast('Expense deleted.');
  };

  return { addExpense, updateExpense, removeExpense };
}
