import { usePersistentState } from '../lib/usePersistentState.js';
import {
  INVENTORY_TRANSACTION_TYPES,
  getExpenseUnitCost,
  getBalance as getBalanceRaw,
  getWeightedAverageCost as getWeightedAverageCostRaw,
} from '../lib/inventoryLedger.js';
import { createUnitActions } from '../lib/actions/unitActions.js';
import { createExpenseActions } from '../lib/actions/expenseActions.js';
import { createInventoryActions } from '../lib/actions/inventoryActions.js';
import { createLogActions } from '../lib/actions/logActions.js';

const LEGACY_KEY = 'farm-inventory-movements';
const LEDGER_KEY = 'farm-inventory-ledger';

// One-time migration from an older storage format. Runs only as the lazy
// initial value for the `LEDGER_KEY` state below — once anything is saved
// under that key, this is never consulted again.
function readLegacyTransactions() {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    return legacy.map((m) => ({
      ...m,
      transactionType: m.transactionType || (m.source === 'daily-log' ? 'consumption' : m.type === 'in' ? 'purchase' : 'consumption'),
      direction: m.direction || m.type || (m.source === 'daily-log' ? 'out' : 'in'),
      source: m.source || 'manual',
    }));
  } catch {
    return [];
  }
}

export { INVENTORY_TRANSACTION_TYPES };

// This hook is deliberately thin: it owns the state (five usePersistentState
// slices) and composes the action modules in src/lib/actions/, each of
// which groups one domain's CRUD. Cross-domain effects — a feed expense
// moving inventory, a daily log consuming it, deleting a unit cascading
// into its logs/expenses/transactions — are why those modules take each
// other's setters as arguments rather than being fully independent hooks;
// the actual math for each of those effects lives in src/lib/*Linking.js
// as plain, testable functions.
export function useFarmData(showToast) {
  const [units, setUnits] = usePersistentState('farm-units', []);
  const [logs, setLogs] = usePersistentState('farm-logs', []);
  const [expenses, setExpenses] = usePersistentState('farm-expenses', []);
  const [inventory, setInventory] = usePersistentState('farm-inventory', []);
  const [transactions, setInventoryTransactions] = usePersistentState(LEDGER_KEY, readLegacyTransactions());

  const unitActions = createUnitActions({ setUnits, setLogs, setExpenses, setInventoryTransactions, showToast });
  const expenseActions = createExpenseActions({ inventory, transactions, setExpenses, setInventoryTransactions, showToast });
  const inventoryActions = createInventoryActions({ inventory, transactions, expenses, setInventory, setInventoryTransactions, setExpenses, showToast });
  const logActions = createLogActions({ units, logs, inventory, transactions, setLogs, setInventoryTransactions, showToast });

  return {
    units, logs, expenses, inventory,
    inventoryMoves: transactions,
    inventoryTransactions: transactions,

    ...unitActions,
    ...logActions,
    ...expenseActions,
    ...inventoryActions,
    addInventoryMove: inventoryActions.addInventoryTransaction,
    updateInventoryMove: inventoryActions.updateInventoryTransaction,
    removeInventoryMove: inventoryActions.removeInventoryTransaction,

    // Public signatures kept identical to before (itemId first, optional
    // txs/exclude overrides) even though the underlying pure functions now
    // take inventory/transactions explicitly — existing callers (e.g.
    // DailyLogView's getBalance(i.id)) don't need to change.
    getExpenseUnitCost,
    getBalance: (itemId, txs = transactions, excludedId = null) => getBalanceRaw(inventory, txs, itemId, excludedId),
    getWeightedAverageCost: (itemId, txs = transactions) => getWeightedAverageCostRaw(inventory, txs, itemId),
    getFeedItems: () => inventory.filter((i) => i.category === 'Feed'),
    getTransactions: () => transactions,
    transactionTypes: INVENTORY_TRANSACTION_TYPES,
  };
}
