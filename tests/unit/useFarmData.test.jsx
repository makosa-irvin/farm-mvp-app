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
    result.current.addUnit({ id: 'u1', name: 'Layer House A', type: 'eggs', initialCount: 100, startDate: '2026-08-01', producePrice: 0.2 });
    result.current.addInventoryItem({ id: 'i1', name: 'Layer Mash', category: 'Feed', unit: 'kg', openingStock: 0, reorderLevel: 20, unitCost: 0 });
  });
  return result;
}

function addFeedExpense(result, overrides = {}) {
  act(() => {
    result.current.addExpense({
      id: 'e1', category: 'feed', amount: 105, date: '2026-08-17',
      unitId: null, description: '', inventoryItemId: 'i1', inventoryQuantity: 150,
      createdAt: Date.now(),
      ...overrides,
    });
  });
}

function addFeedLog(result) {
  act(() => {
    result.current.addLog(
      { id: 'l1', unitId: 'u1', date: '2026-08-18', produced: 90, grades: { large: 60, medium: 25, small: 5 }, loss: 4, feedKg: 45, feedQuantity: 45, feedItemId: 'i1', mortality: 1, notes: '' },
      result.current.units[0]
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
        id: 'e1', category: 'feed', amount: 28, date: '2026-08-17',
        unitId: null, description: '', inventoryItemId: 'i1', inventoryQuantity: 40,
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
        id: 'e1', category: 'feed', amount: 140, date: '2026-08-17',
        unitId: null, description: '', inventoryItemId: 'i1', inventoryQuantity: 200,
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

    await act(async () => { await result.current.removeExpense('e1'); });

    expect(result.current.expenses.some((e) => e.id === 'e1')).toBe(true);
    expect(result.current.getBalance('i1')).toBe(105);
  });

  it('allows deleting an expense once nothing depends on its stock, and fully removes the linked transaction', async () => {
    const result = setupFarm(toasts);
    addFeedExpense(result);
    addFeedLog(result);
    await act(async () => { await result.current.removeLog('l1'); });
    expect(result.current.getBalance('i1')).toBe(150);

    await act(async () => { await result.current.removeExpense('e1'); });

    expect(result.current.expenses.some((e) => e.id === 'e1')).toBe(false);
    expect(result.current.getBalance('i1')).toBe(0);
    expect(result.current.inventoryTransactions.some((t) => t.source === 'expense-purchase' && t.sourceId === 'e1')).toBe(false);
  });

  it('cost-per-unit reflects only what was actually consumed, not the full purchase', async () => {
    const { unitMetrics } = await import('../../src/lib/helpers.js');
    const result = setupFarm(toasts);
    addFeedExpense(result);
    addFeedLog(result);

    const metrics = unitMetrics(result.current.units[0], result.current.logs, result.current.expenses, 'all', result.current.inventoryTransactions);
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
      tx = result.current.addInventoryTransaction({ itemId: 'i1', transactionType: 'purchase', quantity: 20, date: '2026-08-17', unitCost: 4 });
    });
    expect(tx).toBeTruthy();
    expect(result.current.getBalance('i1')).toBe(20);
  });

  it('records a transfer as a balance-neutral paired out/in entry', () => {
    const result = setupFarm(toasts);
    act(() => { result.current.addUnit({ id: 'u2', name: 'Barn B', type: 'milk', initialCount: 20, startDate: '2026-08-01' }); });
    act(() => { result.current.addInventoryTransaction({ itemId: 'i1', transactionType: 'purchase', quantity: 20, date: '2026-08-17', unitCost: 4 }); });

    let transferResult;
    act(() => {
      transferResult = result.current.addInventoryTransaction({ itemId: 'i1', transactionType: 'transfer', quantity: 5, date: '2026-08-18', sourceUnitId: 'u1', destinationUnitId: 'u2' });
    });

    expect(transferResult).toBeTruthy();
    expect(result.current.getBalance('i1')).toBe(20); // unchanged overall
    const pair = result.current.inventoryTransactions.filter((t) => t.transferId === transferResult.transferId);
    expect(pair).toHaveLength(2);
  });

  it('removing a unit un-attributes its expenses and cleans up its transactions, without deleting the expenses themselves', async () => {
    const result = setupFarm(toasts);
    act(() => { result.current.addUnit({ id: 'u2', name: 'Barn B', type: 'milk', initialCount: 20, startDate: '2026-08-01' }); });
    act(() => { result.current.addExpense({ id: 'e2', category: 'labor', amount: 50, date: '2026-08-17', unitId: 'u2', description: '', inventoryItemId: null, inventoryQuantity: null }); });

    await act(async () => { await result.current.removeUnit('u2'); });

    expect(result.current.units.some((u) => u.id === 'u2')).toBe(false);
    expect(result.current.expenses.find((e) => e.id === 'e2').unitId).toBeNull();
  });
});
