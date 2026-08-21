import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFarmData } from '../../src/hooks/useFarmData.js';

// Sets up a unit + a Feed inventory item that every test in this file
// builds on. Each test gets its own renderHook() call — tests intentionally
// don't share state with each other, only this common starting point.
//
// confirm() always resolves true here, standing in for a user who always
// clicks "Yes, remove it" in the real ConfirmDialog — this hook no longer
// uses window.confirm at all (see useConfirmDialog.js), so mocking that is
// no longer relevant.
function setupFarm(toasts) {
  const confirm = async () => true;
  const { result } = renderHook(() => useFarmData((msg) => toasts.push(msg), confirm));
  act(() => {
    result.current.addUnit({
      id: 'u1',
      name: 'Layer House A',
      type: 'eggs',
      initialCount: 100,
      startDate: '2026-08-01',
      producePrice: 0.2,
    });
    result.current.addInventoryItem({
      id: 'i1',
      name: 'Layer Mash',
      category: 'Feed',
      unit: 'kg',
      openingStock: 0,
      reorderLevel: 20,
      unitCost: 0,
    });
  });
  return result;
}

function addFeedExpense(result, overrides = {}) {
  act(() => {
    result.current.addExpense({
      id: 'e1',
      category: 'feed',
      amount: 105,
      date: '2026-08-17',
      unitId: null,
      description: '',
      inventoryItemId: 'i1',
      inventoryQuantity: 150,
      createdAt: Date.now(),
      ...overrides,
    });
  });
}

function addFeedLog(result) {
  act(() => {
    result.current.addLog(
      {
        id: 'l1',
        unitId: 'u1',
        date: '2026-08-18',
        produced: 90,
        grades: { large: 60, medium: 25, small: 5 },
        loss: 4,
        feedKg: 45,
        feedQuantity: 45,
        feedItemId: 'i1',
        mortality: 1,
        notes: '',
      },
      result.current.units[0],
    );
  });
}

describe('useFarmData — expense/inventory/log linking', () => {
  let toasts;

  beforeEach(() => {
    localStorage.clear();
    toasts = [];
  });

  it('adding a feed expense linked to an inventory item increases stock and creates a linked purchase transaction', () => {
    const result = setupFarm(toasts);
    expect(result.current.getBalance('i1')).toBe(0);

    addFeedExpense(result);

    expect(result.current.getBalance('i1')).toBe(150);
    const purchaseTx = result.current.inventoryTransactions.find((t) => t.source === 'expense-purchase' && t.sourceId === 'e1');
    expect(purchaseTx).toBeTruthy();
    expect(purchaseTx.unitCost).toBeCloseTo(0.7);
  });

  it('logging feed consumption reduces inventory', () => {
    const result = setupFarm(toasts);
    addFeedExpense(result);

    addFeedLog(result);

    expect(result.current.getBalance('i1')).toBe(105);
  });

  it('rejects reducing a purchase below what has already been consumed', () => {
    const result = setupFarm(toasts);
    addFeedExpense(result);
    addFeedLog(result);

    let updateResult;
    act(() => {
      updateResult = result.current.updateExpense({
        id: 'e1',
        category: 'feed',
        amount: 28,
        date: '2026-08-17',
        unitId: null,
        description: '',
        inventoryItemId: 'i1',
        inventoryQuantity: 40,
        createdAt: result.current.expenses[0].createdAt,
      });
    });

    expect(updateResult).toBe(false);
    expect(result.current.getBalance('i1')).toBe(105);
    expect(toasts.at(-1)).toMatch(/already been used/);
  });

  it('allows increasing a purchase quantity even with existing consumption', () => {
    const result = setupFarm(toasts);
    addFeedExpense(result);
    addFeedLog(result);

    let updateResult;
    act(() => {
      updateResult = result.current.updateExpense({
        id: 'e1',
        category: 'feed',
        amount: 140,
        date: '2026-08-17',
        unitId: null,
        description: '',
        inventoryItemId: 'i1',
        inventoryQuantity: 200,
        createdAt: result.current.expenses[0].createdAt,
      });
    });

    expect(updateResult).toBe(true);
    expect(result.current.getBalance('i1')).toBe(155); // 200 - 45
  });

  it('blocks deleting an expense while its stock is still in use', async () => {
    const result = setupFarm(toasts);
    addFeedExpense(result);
    addFeedLog(result);

    await act(async () => {
      await result.current.removeExpense('e1');
    });

    expect(result.current.expenses.some((e) => e.id === 'e1')).toBe(true);
    expect(result.current.getBalance('i1')).toBe(105);
  });

  it('allows deleting an expense once nothing depends on its stock, and fully removes the linked transaction', async () => {
    const result = setupFarm(toasts);
    addFeedExpense(result);
    addFeedLog(result);
    await act(async () => {
      await result.current.removeLog('l1');
    });
    expect(result.current.getBalance('i1')).toBe(150);

    await act(async () => {
      await result.current.removeExpense('e1');
    });

    expect(result.current.expenses.some((e) => e.id === 'e1')).toBe(false);
    expect(result.current.getBalance('i1')).toBe(0);
    expect(result.current.inventoryTransactions.some((t) => t.source === 'expense-purchase' && t.sourceId === 'e1')).toBe(false);
  });

  it('cost-per-unit reflects only what was actually consumed, not the full purchase', async () => {
    const { unitMetrics } = await import('../../src/lib/helpers.js');
    const result = setupFarm(toasts);
    addFeedExpense(result);
    addFeedLog(result);

    const metrics = unitMetrics(
      result.current.units[0],
      result.current.logs,
      result.current.expenses,
      'all',
      result.current.inventoryTransactions,
    );
    expect(metrics.directCost).toBeCloseTo(31.5); // 45kg * $0.70/kg, not the full $105
  });
});

describe('useFarmData — manual inventory ledger and unit cascade', () => {
  let toasts;

  beforeEach(() => {
    localStorage.clear();
    toasts = [];
  });

  it('records a manual purchase transaction directly (not via an expense)', () => {
    const result = setupFarm(toasts);
    let tx;
    act(() => {
      tx = result.current.addInventoryTransaction({
        itemId: 'i1',
        transactionType: 'purchase',
        quantity: 20,
        date: '2026-08-17',
        unitCost: 4,
      });
    });
    expect(tx).toBeTruthy();
    expect(result.current.getBalance('i1')).toBe(20);
  });

  it('records a transfer as a balance-neutral paired out/in entry', () => {
    const result = setupFarm(toasts);
    act(() => {
      result.current.addUnit({ id: 'u2', name: 'Barn B', type: 'milk', initialCount: 20, startDate: '2026-08-01' });
    });
    act(() => {
      result.current.addInventoryTransaction({ itemId: 'i1', transactionType: 'purchase', quantity: 20, date: '2026-08-17', unitCost: 4 });
    });

    let transferResult;
    act(() => {
      transferResult = result.current.addInventoryTransaction({
        itemId: 'i1',
        transactionType: 'transfer',
        quantity: 5,
        date: '2026-08-18',
        sourceUnitId: 'u1',
        destinationUnitId: 'u2',
      });
    });

    expect(transferResult).toBeTruthy();
    expect(result.current.getBalance('i1')).toBe(20); // unchanged overall
    const pair = result.current.inventoryTransactions.filter((t) => t.transferId === transferResult.transferId);
    expect(pair).toHaveLength(2);
  });

  it('removing a unit un-attributes its expenses and cleans up its transactions, without deleting the expenses themselves', async () => {
    const result = setupFarm(toasts);
    act(() => {
      result.current.addUnit({ id: 'u2', name: 'Barn B', type: 'milk', initialCount: 20, startDate: '2026-08-01' });
    });
    act(() => {
      result.current.addExpense({
        id: 'e2',
        category: 'labor',
        amount: 50,
        date: '2026-08-17',
        unitId: 'u2',
        description: '',
        inventoryItemId: null,
        inventoryQuantity: null,
      });
    });

    await act(async () => {
      await result.current.removeUnit('u2');
    });

    expect(result.current.units.some((u) => u.id === 'u2')).toBe(false);
    expect(result.current.expenses.find((e) => e.id === 'e2').unitId).toBeNull();
  });
});

// Regression coverage for a confirmed bug: wastage/loss/downward-adjustment
// inventory transactions auto-create a matching "non-cash" expense record
// (see buildInventoryCostExpense in inventoryActions.js) so the cost is
// visible in Expenses. That synthetic record used to be editable/deletable
// through the normal expense actions, which only understand the opposite
// direction of link (an expense that creates a purchase). Deleting one
// orphaned the real inventory transaction (the cost kept counting,
// invisibly); editing one fabricated a fake purchase transaction that
// silently canceled out the real loss in the inventory ledger. Both were
// proven with this exact scenario before the fix landed.
describe('synthetic (non-cash) expense records — must not be editable via expense actions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setupFarmWithWastage(toasts) {
    const confirm = async () => true;
    const { result } = renderHook(() => useFarmData((msg) => toasts.push(msg), confirm));
    act(() => {
      result.current.addUnit({
        id: 'u1',
        name: 'Layer House A',
        type: 'eggs',
        initialCount: 100,
        startDate: '2026-08-01',
        producePrice: 0,
      });
      result.current.addInventoryItem({
        id: 'i1',
        name: 'Layer Mash',
        category: 'Feed',
        unit: 'kg',
        openingStock: 100,
        reorderLevel: 20,
        unitCost: 50,
      });
    });
    act(() => {
      result.current.addInventoryMove({
        id: 'txn1',
        itemId: 'i1',
        transactionType: 'wastage',
        direction: 'out',
        quantity: 10,
        unit: 'kg',
        unitCost: 50,
        date: '2026-08-10',
        unitId: 'u1',
        note: '',
      });
    });
    return result;
  }

  it('removeExpense() refuses a synthetic record and leaves the real inventory transaction untouched', async () => {
    const toasts = [];
    const result = setupFarmWithWastage(toasts);
    const synthetic = result.current.expenses.find((e) => e.inventoryTransactionId === 'txn1');
    expect(synthetic).toBeTruthy();

    await act(async () => {
      await result.current.removeExpense(synthetic.id);
    });

    expect(result.current.expenses.some((e) => e.id === synthetic.id)).toBe(true); // refused, not removed
    expect(result.current.inventoryTransactions.some((t) => t.id === 'txn1')).toBe(true); // never at risk
    expect(toasts.some((t) => t.includes('Stock instead'))).toBe(true);
  });

  it('updateExpense() refuses a synthetic record and never fabricates a phantom purchase transaction', async () => {
    const toasts = [];
    const result = setupFarmWithWastage(toasts);
    const synthetic = result.current.expenses.find((e) => e.inventoryTransactionId === 'txn1');

    act(() => {
      result.current.updateExpense({ ...synthetic, description: 'edited note' });
    });

    expect(result.current.inventoryTransactions.find((t) => t.transactionType === 'purchase')).toBeUndefined();
    expect(result.current.expenses.find((e) => e.id === synthetic.id).description).not.toBe('edited note');
  });

  it('a real expense is completely unaffected by the guard', async () => {
    const toasts = [];
    const result = setupFarmWithWastage(toasts);
    act(() => {
      result.current.addExpense({
        id: 'e1',
        category: 'labor',
        amount: 200,
        date: '2026-08-11',
        unitId: 'u1',
        description: '',
        inventoryItemId: null,
        inventoryQuantity: null,
      });
    });
    await act(async () => {
      await result.current.removeExpense('e1');
    });
    expect(result.current.expenses.some((e) => e.id === 'e1')).toBe(false); // real removal still works
  });
});

describe('useFarmData — backup export/import round-trip', () => {
  let toasts;

  beforeEach(() => {
    localStorage.clear();
    toasts = [];
  });

  it('importData replaces all five data slices, after confirmation, and reports success', async () => {
    const confirm = async () => true;
    const { result } = renderHook(() => useFarmData((msg) => toasts.push(msg), confirm));

    act(() => {
      result.current.addUnit({ id: 'u1', name: 'Old Unit', type: 'eggs', initialCount: 5, startDate: '2026-01-01' });
    });
    expect(result.current.units).toHaveLength(1);

    const backupFile = {
      text: () =>
        Promise.resolve(
          JSON.stringify({
            kind: 'mazaosmart-backup',
            version: 1,
            data: {
              units: [{ id: 'u2', name: 'Restored Unit', type: 'milk', initialCount: 20, startDate: '2026-02-01' }],
              logs: [{ id: 'l1', unitId: 'u2', date: '2026-02-02', produced: 10, mortality: 0 }],
              expenses: [],
              inventory: [],
              inventoryTransactions: [],
            },
          }),
        ),
    };

    let success;
    await act(async () => {
      success = await result.current.importData(backupFile);
    });

    expect(success).toBe(true);
    expect(result.current.units).toEqual([{ id: 'u2', name: 'Restored Unit', type: 'milk', initialCount: 20, startDate: '2026-02-01' }]);
    expect(result.current.logs).toHaveLength(1);
    expect(toasts.some((t) => t.includes('restored'))).toBe(true);
  });

  it('importData asks for confirmation before overwriting, and does nothing if declined', async () => {
    const confirm = async () => false; // user clicks "cancel"
    const { result } = renderHook(() => useFarmData((msg) => toasts.push(msg), confirm));

    act(() => {
      result.current.addUnit({ id: 'u1', name: 'Keep Me', type: 'eggs', initialCount: 5, startDate: '2026-01-01' });
    });

    const backupFile = {
      text: () =>
        Promise.resolve(
          JSON.stringify({
            kind: 'mazaosmart-backup',
            version: 1,
            data: { units: [{ id: 'u2', name: 'Should Not Appear' }], logs: [], expenses: [], inventory: [], inventoryTransactions: [] },
          }),
        ),
    };

    let success;
    await act(async () => {
      success = await result.current.importData(backupFile);
    });

    expect(success).toBe(false);
    expect(result.current.units).toEqual([{ id: 'u1', name: 'Keep Me', type: 'eggs', initialCount: 5, startDate: '2026-01-01' }]);
  });

  it('importData rejects an invalid file without touching existing data', async () => {
    const confirm = async () => true;
    const { result } = renderHook(() => useFarmData((msg) => toasts.push(msg), confirm));

    act(() => {
      result.current.addUnit({ id: 'u1', name: 'Untouched', type: 'eggs', initialCount: 5, startDate: '2026-01-01' });
    });

    const notABackupFile = { text: () => Promise.resolve(JSON.stringify({ random: 'file' })) };

    let success;
    await act(async () => {
      success = await result.current.importData(notABackupFile);
    });

    expect(success).toBe(false);
    expect(result.current.units).toHaveLength(1);
    expect(toasts.some((t) => t.includes('not a Mazaosmart backup'))).toBe(true);
  });

  it('a full export -> import round-trip preserves every record exactly', async () => {
    const confirm = async () => true;
    const { result } = renderHook(() => useFarmData((msg) => toasts.push(msg), confirm));

    act(() => {
      result.current.addUnit({
        id: 'u1',
        name: 'Layer House A',
        type: 'eggs',
        initialCount: 100,
        startDate: '2026-01-01',
        producePrice: 12,
      });
      result.current.addInventoryItem({
        id: 'i1',
        name: 'Layer Mash',
        category: 'Feed',
        unit: 'kg',
        openingStock: 50,
        reorderLevel: 10,
        unitCost: 70,
      });
      result.current.addExpense({
        id: 'e1',
        category: 'labor',
        amount: 500,
        date: '2026-01-02',
        unitId: 'u1',
        description: '',
        inventoryItemId: null,
        inventoryQuantity: null,
      });
    });

    const originalUnits = result.current.units;
    const originalInventory = result.current.inventory;
    const originalExpenses = result.current.expenses;

    // Simulate exporting then immediately re-importing the same data,
    // the way a user might do to move to a new phone.
    const { buildBackup } = await import('../../src/lib/dataBackup.js');
    const exported = buildBackup({
      units: result.current.units,
      logs: result.current.logs,
      expenses: result.current.expenses,
      inventory: result.current.inventory,
      inventoryTransactions: result.current.inventoryTransactions,
    });
    const roundTripFile = { text: () => Promise.resolve(JSON.stringify(exported)) };

    await act(async () => {
      await result.current.importData(roundTripFile);
    });

    expect(result.current.units).toEqual(originalUnits);
    expect(result.current.inventory).toEqual(originalInventory);
    expect(result.current.expenses).toEqual(originalExpenses);
  });
});

describe('useFarmData — abandoned onboarding tour leaves no permanent tutorial data', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('mount-time cleanup removes tutorial data left over from a previous, abandoned session', () => {
    const toasts = [];
    const confirm = async () => true;

    const { result: firstSession, unmount } = renderHook(() => useFarmData((msg) => toasts.push(msg), confirm));
    act(() => {
      firstSession.current.seedTutorialData();
    });
    expect(firstSession.current.units.some((u) => u.tutorial)).toBe(true);
    unmount(); // the tab "closes" — no resetTutorialData() call happens

    const { result: secondSession } = renderHook(() => useFarmData((msg) => toasts.push(msg), confirm));
    expect(secondSession.current.units.some((u) => u.tutorial)).toBe(false);
  });

  it('does not disturb real farm data while cleaning up leftover tutorial data', () => {
    const toasts = [];
    const confirm = async () => true;
    const { result: firstSession, unmount } = renderHook(() => useFarmData((msg) => toasts.push(msg), confirm));

    act(() => {
      firstSession.current.addUnit({
        id: 'real-unit',
        name: 'My Real Farm Group',
        type: 'eggs',
        initialCount: 50,
        startDate: '2026-08-01',
      });
      firstSession.current.seedTutorialData();
    });
    unmount();

    const { result: secondSession } = renderHook(() => useFarmData((msg) => toasts.push(msg), confirm));
    expect(secondSession.current.units).toEqual([
      { id: 'real-unit', name: 'My Real Farm Group', type: 'eggs', initialCount: 50, startDate: '2026-08-01' },
    ]);
  });

  it('the beforeunload handler cleans up tutorial data still present in localStorage at unload time', () => {
    const toasts = [];
    const confirm = async () => true;
    const { result } = renderHook(() => useFarmData((msg) => toasts.push(msg), confirm));

    act(() => {
      result.current.seedTutorialData();
    });
    expect(JSON.parse(localStorage.getItem('farm-units')).some((u) => u.tutorial)).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(JSON.parse(localStorage.getItem('farm-units')).some((u) => u.tutorial)).toBe(false);
  });
});
