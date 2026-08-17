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

    return legacy.map((movement) => ({
      ...movement,
      transactionType:
        movement.transactionType ||
        (movement.source === 'daily-log'
          ? 'consumption'
          : movement.type === 'in'
            ? 'purchase'
            : 'consumption'),
      direction:
        movement.direction ||
        movement.type ||
        (movement.source === 'daily-log' ? 'out' : 'in'),
      source: movement.source || 'manual',
    }));
  } catch {
    return [];
  }
}

export { INVENTORY_TRANSACTION_TYPES };

// This hook is the application state boundary. It owns persistent data slices
// and composes domain action factories; calculations and cross-domain
// synchronization live in src/lib so they can be tested without React.
export function useFarmData(showToast) {
  const [units, setUnits] = usePersistentState('farm-units', []);
  const [logs, setLogs] = usePersistentState('farm-logs', []);
  const [expenses, setExpenses] = usePersistentState('farm-expenses', []);
  const [inventory, setInventory] = usePersistentState('farm-inventory', []);
  const [transactions, setInventoryTransactions] = usePersistentState(
    LEDGER_KEY,
    readLegacyTransactions(),
  );

  const unitActions = createUnitActions({
    setUnits,
    setLogs,
    setExpenses,
    setInventoryTransactions,
    showToast,
  });
  const expenseActions = createExpenseActions({
    inventory,
    transactions,
    setExpenses,
    setInventoryTransactions,
    showToast,
  });
  const inventoryActions = createInventoryActions({
    inventory,
    transactions,
    expenses,
    setInventory,
    setInventoryTransactions,
    setExpenses,
    showToast,
  });
  const logActions = createLogActions({
    units,
    logs,
    inventory,
    transactions,
    setLogs,
    setInventoryTransactions,
    showToast,
  });

  return {
    units,
    logs,
    expenses,
    inventory,
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
    // Views can request a balance or cost without knowing how inventory state
    // is stored internally.
    getExpenseUnitCost,
    getBalance: (
      itemId,
      txs = transactions,
      excludedId = null,
    ) => getBalanceRaw(inventory, txs, itemId, excludedId),
    getWeightedAverageCost: (itemId, txs = transactions) =>
      getWeightedAverageCostRaw(inventory, txs, itemId),
    getFeedItems: () => inventory.filter((item) => item.category === 'Feed'),
    getTransactions: () => transactions,
    transactionTypes: INVENTORY_TRANSACTION_TYPES,
  };
}
