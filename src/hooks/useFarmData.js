import { usePersistentState } from '../lib/usePersistentState.js';
import { INVENTORY_TRANSACTION_TYPES, getExpenseUnitCost, getBalance as getBalanceRaw, getWeightedAverageCost as getWeightedAverageCostRaw } from '../lib/inventoryLedger.js';
import { createUnitActions } from '../lib/actions/unitActions.js';
import { createExpenseActions } from '../lib/actions/expenseActions.js';
import { createInventoryActions } from '../lib/actions/inventoryActions.js';
import { createLogActions } from '../lib/actions/logActions.js';
import { buildBackup, downloadBackup, validateBackup } from '../lib/dataBackup.js';

const LEGACY_KEY = 'farm-inventory-movements';
const LEDGER_KEY = 'farm-inventory-ledger';

function readLegacyTransactions() {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    return legacy.map((movement) => ({
      ...movement,
      transactionType: movement.transactionType || (movement.source === 'daily-log' ? 'consumption' : movement.type === 'in' ? 'purchase' : 'consumption'),
      direction: movement.direction || movement.type || (movement.source === 'daily-log' ? 'out' : 'in'),
      source: movement.source || 'manual',
    }));
  } catch {
    return [];
  }
}

export { INVENTORY_TRANSACTION_TYPES };

/** Application state boundary and local-first persistence coordinator. */
export function useFarmData(showToast, confirm) {
  const [units, setUnits] = usePersistentState('farm-units', []);
  const [logs, setLogs] = usePersistentState('farm-logs', []);
  const [expenses, setExpenses] = usePersistentState('farm-expenses', []);
  const [inventory, setInventory] = usePersistentState('farm-inventory', []);
  const [transactions, setInventoryTransactions] = usePersistentState(LEDGER_KEY, readLegacyTransactions());

  const unitActions = createUnitActions({ units, setUnits, setLogs, setExpenses, setInventoryTransactions, showToast, confirm });
  const expenseActions = createExpenseActions({ expenses, inventory, transactions, setExpenses, setInventoryTransactions, showToast, confirm });
  const inventoryActions = createInventoryActions({ inventory, transactions, expenses, setInventory, setInventoryTransactions, setExpenses, showToast, confirm });
  const logActions = createLogActions({ units, logs, inventory, transactions, setLogs, setInventoryTransactions, showToast, confirm });

  const exportData = () => {
    downloadBackup(buildBackup({ units, logs, expenses, inventory, inventoryTransactions: transactions }));
    showToast('Backup downloaded. Keep it somewhere safe.');
  };

  const importData = async (file) => {
    try {
      const parsed = JSON.parse(await file.text());
      const data = validateBackup(parsed);
      if (!(await confirm('Restore this backup? Current farm records on this device will be replaced.'))) return false;
      setUnits(data.units);
      setLogs(data.logs);
      setExpenses(data.expenses);
      setInventory(data.inventory);
      setInventoryTransactions(data.inventoryTransactions);
      showToast('Backup restored successfully.');
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not restore this backup.');
      return false;
    }
  };

  return {
    units, logs, expenses, inventory,
    inventoryMoves: transactions,
    inventoryTransactions: transactions,
    ...unitActions, ...logActions, ...expenseActions, ...inventoryActions,
    addInventoryMove: inventoryActions.addInventoryTransaction,
    updateInventoryMove: inventoryActions.updateInventoryTransaction,
    removeInventoryMove: inventoryActions.removeInventoryTransaction,
    getExpenseUnitCost,
    getBalance: (itemId, txs = transactions, excludedId = null) => getBalanceRaw(inventory, txs, itemId, excludedId),
    getWeightedAverageCost: (itemId, txs = transactions) => getWeightedAverageCostRaw(inventory, txs, itemId),
    getFeedItems: () => inventory.filter((item) => item.category === 'Feed'),
    getTransactions: () => transactions,
    transactionTypes: INVENTORY_TRANSACTION_TYPES,
    exportData,
    importData,
  };
}
