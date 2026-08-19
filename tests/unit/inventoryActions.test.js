import { describe, expect, it, vi } from 'vitest';
import { createInventoryActions } from '../../src/lib/actions/inventoryActions.js';

describe('inventory actions — imported opening stock', () => {
  it('records imported opening quantity as a dated stock movement', () => {
    let inventory = [];
    let transactions = [];
    const setInventory = vi.fn((updater) => {
      inventory = typeof updater === 'function' ? updater(inventory) : updater;
    });
    const setInventoryTransactions = vi.fn((updater) => {
      transactions = typeof updater === 'function' ? updater(transactions) : updater;
    });

    const actions = createInventoryActions({
      inventory,
      transactions,
      expenses: [],
      setInventory,
      setInventoryTransactions,
      setExpenses: vi.fn(),
      showToast: vi.fn(),
      confirm: vi.fn(async () => true),
    });

    actions.addInventoryItem({
      id: 'item-1',
      name: 'Layer Mash',
      category: 'Feed',
      unit: 'kg',
      openingStock: 50,
      openingDate: '2026-01-01',
      unitCost: 75,
      reorderLevel: 10,
    });

    expect(inventory[0].openingStock).toBe(0);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      itemId: 'item-1',
      transactionType: 'purchase',
      direction: 'in',
      quantity: 50,
      unit: 'kg',
      unitCost: 75,
      date: '2026-01-01',
      source: 'import',
      note: 'Imported opening stock',
    });
  });
});
