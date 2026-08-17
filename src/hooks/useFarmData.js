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

// Keep the legacy key readable so existing browser data can be migrated to
// the ledger without requiring the user to re-enter historical movements.
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

// This hook is the application state boundary. It owns the persistent data
// slices and composes domain action factories; calculations and cross-domain
// synchronization live in src/lib so they can be tested without React.
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

    // Keep the hook API stable while the ledger implementation remains pure.
    // Existing views can request a balance or cost without knowing how the
    // underlying inventory state is stored.
    getExpenseUnitCost,
    getBalance: (itemId, txs = transactions, excludedId = null) => getBalanceRaw(inventory, txs, itemId, excludedId),
    getWeightedAverageCost: (itemId, txs = transactions) => getWeightedAverageCostRaw(inventory, txs, itemId),
    getFeedItems: () => inventory.filter((i) => i.category === 'Feed'),
    getTransactions: () => transactions,
    transactionTypes: INVENTORY_TRANSACTION_TYPES,
  };
}
