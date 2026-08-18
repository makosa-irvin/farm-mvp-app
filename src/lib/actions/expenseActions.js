// Expense CRUD, plus the automatic sync to a linked inventory purchase
// transaction (see src/lib/expenseLinking.js). This is what makes an
// expense with an inventory item + quantity actually move stock, rather
// than the link just being metadata that nothing acts on.
import { fmtNum, fmtMoney } from '../helpers.js';
import { syncedTransactionsForExpense, balanceIfExpensePurchaseRemoved } from '../expenseLinking.js';

export function createExpenseActions({ inventory, transactions, setExpenses, setInventoryTransactions, showToast, confirm }) {
  // Expense-linked purchases must be synchronized before an edit is saved.
  // A failed synchronization leaves both the expense and ledger unchanged.
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
    syncExpensePurchaseTransaction(expense);
    showToast(`${fmtMoney(expense.amount)} expense logged.`);
    return true;
  };

  const updateExpense = (expense) => {
    if (!syncExpensePurchaseTransaction(expense)) return false;
    setExpenses((prev) => prev.map((x) => (x.id === expense.id ? expense : x)));
    showToast('Expense updated.');
    return true;
  };

  const removeExpense = async (id) => {
    const { linkedTx, balance } = balanceIfExpensePurchaseRemoved(id, inventory, transactions);
    if (linkedTx && balance < -1e-9) {
      const item = inventory.find((i) => i.id === linkedTx.itemId);
      showToast(`Can't remove — ${fmtNum(Math.abs(balance))} ${item?.unit || ''} of ${item?.name || 'this item'} from this purchase has already been used elsewhere.`);
      return;
    }
    const message = linkedTx
      ? 'Remove this expense? The stock it added will be removed too, so the amount goes back down.'
      : 'Remove this expense?';
    if (!(await confirm(message))) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (linkedTx) setInventoryTransactions((prev) => prev.filter((t) => t.id !== linkedTx.id));
    showToast('Expense removed.');
  };

  return { addExpense, updateExpense, removeExpense };
}
