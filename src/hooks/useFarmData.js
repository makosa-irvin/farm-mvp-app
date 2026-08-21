import { useEffect } from 'react';
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
import { buildBackup, downloadBackup, validateBackup } from '../lib/dataBackup.js';
import { todayISO } from '../lib/helpers.js';

const LEGACY_KEY = 'farm-inventory-movements';
const LEDGER_KEY = 'farm-inventory-ledger';
const TUTORIAL_UNIT_ID = 'tutorial_unit_mazao';
const TUTORIAL_INVENTORY_ID = 'tutorial_inventory_mazao';
const TUTORIAL_EXPENSE_ID = 'tutorial_expense_mazao';
const TUTORIAL_EXPENSE_2_ID = 'tutorial_expense_2_mazao';
const TUTORIAL_LOG_ID = 'tutorial_log_mazao';

function readLegacyTransactions() {
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
    return legacy.map((movement) => ({
      ...movement,
      transactionType:
        movement.transactionType || (movement.source === 'daily-log' ? 'consumption' : movement.type === 'in' ? 'purchase' : 'consumption'),
      direction: movement.direction || movement.type || (movement.source === 'daily-log' ? 'out' : 'in'),
      source: movement.source || 'manual',
    }));
  } catch {
    return [];
  }
}

export { INVENTORY_TRANSACTION_TYPES };

export function useFarmData(showToast, confirm) {
  const [units, setUnits] = usePersistentState('farm-units', []);
  const [logs, setLogs] = usePersistentState('farm-logs', []);
  const [expenses, setExpenses] = usePersistentState('farm-expenses', []);
  const [inventory, setInventory] = usePersistentState('farm-inventory', []);
  const [transactions, setInventoryTransactions] = usePersistentState(LEDGER_KEY, readLegacyTransactions());
  const unitActions = createUnitActions({ units, setUnits, setLogs, setExpenses, setInventoryTransactions, showToast, confirm });
  const expenseActions = createExpenseActions({
    expenses,
    inventory,
    transactions,
    setExpenses,
    setInventoryTransactions,
    showToast,
    confirm,
  });
  const inventoryActions = createInventoryActions({
    inventory,
    transactions,
    expenses,
    setInventory,
    setInventoryTransactions,
    setExpenses,
    showToast,
    confirm,
  });
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
  const seedTutorialData = () => {
    const now = Date.now();
    const date = todayISO();
    setUnits((prev) =>
      prev.some((unit) => unit.tutorial)
        ? prev
        : [
            ...prev,
            {
              id: TUTORIAL_UNIT_ID,
              name: 'Layer House A (Example)',
              type: 'eggs',
              initialCount: 50,
              producePrice: 450,
              startDate: date,
              createdAt: now,
              tutorial: true,
            },
          ],
    );
    setInventory((prev) =>
      prev.some((item) => item.tutorial)
        ? prev
        : [
            ...prev,
            {
              id: TUTORIAL_INVENTORY_ID,
              name: 'Layer Mash (Example)',
              category: 'Feed',
              unit: 'kg',
              openingStock: 50,
              reorderLevel: 10,
              unitCost: 75,
              createdAt: now,
              tutorial: true,
            },
          ],
    );
    setExpenses((prev) =>
      prev.some((expense) => expense.tutorial)
        ? prev
        : [
            ...prev,
            {
              id: TUTORIAL_EXPENSE_ID,
              category: 'feed',
              amount: 3750,
              date,
              unitId: TUTORIAL_UNIT_ID,
              description: '50 kg layer mash (example)',
              supplier: 'Local agrovet (example)',
              paymentMethod: 'mpesa',
              inventoryItemId: null,
              inventoryQuantity: null,
              createdAt: now,
              tutorial: true,
            },
            {
              id: TUTORIAL_EXPENSE_2_ID,
              category: 'labor',
              amount: 1500,
              date,
              unitId: TUTORIAL_UNIT_ID,
              description: 'Casual labour (example)',
              supplier: null,
              paymentMethod: 'cash',
              inventoryItemId: null,
              inventoryQuantity: null,
              createdAt: now + 1,
              tutorial: true,
            },
          ],
    );
    setLogs((prev) =>
      prev.some((log) => log.tutorial)
        ? prev
        : [
            ...prev,
            {
              id: TUTORIAL_LOG_ID,
              unitId: TUTORIAL_UNIT_ID,
              date,
              produced: 30,
              grades: null,
              loss: 2,
              feedKg: 0,
              feedQuantity: 0,
              feedItemId: null,
              mortality: 1,
              notes: 'Example daily record — 30 trays collected, 2 lost, 1 bird lost.',
              createdAt: now,
              tutorial: true,
            },
          ],
    );
  };
  const resetTutorialData = () => {
    setUnits((prev) => prev.filter((unit) => !unit.tutorial));
    setLogs((prev) => prev.filter((log) => !log.tutorial));
    setExpenses((prev) => prev.filter((expense) => !expense.tutorial));
    setInventory((prev) => prev.filter((item) => !item.tutorial));
    setInventoryTransactions((prev) => prev.filter((transaction) => !transaction.tutorial));
  };
  const hasTutorialData = () =>
    units.some((unit) => unit.tutorial) ||
    logs.some((log) => log.tutorial) ||
    expenses.some((expense) => expense.tutorial) ||
    inventory.some((item) => item.tutorial) ||
    transactions.some((transaction) => transaction.tutorial);
  useEffect(() => {
    if (hasTutorialData()) resetTutorialData();
  }, []);
  useEffect(() => {
    const onBeforeUnload = () => {
      try {
        const stillHasTutorialData = ['farm-units', 'farm-logs', 'farm-expenses', 'farm-inventory', LEDGER_KEY].some((key) => {
          const stored = JSON.parse(localStorage.getItem(key) || '[]');
          return Array.isArray(stored) && stored.some((record) => record?.tutorial);
        });
        if (stillHasTutorialData) resetTutorialData();
      } catch {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
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
    getExpenseUnitCost,
    getBalance: (itemId, txs = transactions, excludedId = null) => getBalanceRaw(inventory, txs, itemId, excludedId),
    getWeightedAverageCost: (itemId, txs = transactions) => getWeightedAverageCostRaw(inventory, txs, itemId),
    getFeedItems: () => inventory.filter((item) => item.category === 'Feed'),
    getTransactions: () => transactions,
    transactionTypes: INVENTORY_TRANSACTION_TYPES,
    exportData,
    importData,
    seedTutorialData,
    resetTutorialData,
  };
}
