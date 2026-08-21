import { describe, it, expect } from 'vitest';
import {
  getBalance,
  getWeightedAverageCost,
  getExpenseUnitCost,
  normalizeTransaction,
  checkOutgoing,
} from '../../src/lib/inventoryLedger.js';

describe('getBalance', () => {
  it('starts from opening stock when there are no transactions', () => {
    const inventory = [{ id: 'i1', openingStock: 10 }];
    expect(getBalance(inventory, [], 'i1')).toBe(10);
  });

  it('adds "in" transactions and subtracts "out" transactions for the matching item only', () => {
    const inventory = [{ id: 'i1', openingStock: 10 }];
    const transactions = [
      { id: 't1', itemId: 'i1', direction: 'in', quantity: 20 },
      { id: 't2', itemId: 'i1', direction: 'out', quantity: 5 },
      { id: 't3', itemId: 'other-item', direction: 'in', quantity: 999 },
    ];
    expect(getBalance(inventory, transactions, 'i1')).toBe(25);
  });

  it('can exclude one transaction by id, for recalculating balance while editing it', () => {
    const inventory = [{ id: 'i1', openingStock: 0 }];
    const transactions = [{ id: 't1', itemId: 'i1', direction: 'in', quantity: 20 }];
    expect(getBalance(inventory, transactions, 'i1', 't1')).toBe(0);
  });

  it('returns 0 for an unknown item rather than throwing', () => {
    expect(getBalance([], [], 'missing')).toBe(0);
  });
});

describe('getWeightedAverageCost', () => {
  it('blends opening-stock cost with incoming purchase costs', () => {
    const inventory = [{ id: 'i1', openingStock: 10, unitCost: 1 }];
    const transactions = [{ id: 't1', itemId: 'i1', direction: 'in', quantity: 10, unitCost: 3 }];
    // (10*1 + 10*3) / 20 = 2
    expect(getWeightedAverageCost(inventory, transactions, 'i1')).toBe(2);
  });

  it('ignores outgoing transactions entirely', () => {
    const inventory = [{ id: 'i1', openingStock: 10, unitCost: 1 }];
    const transactions = [
      { id: 't1', itemId: 'i1', direction: 'in', quantity: 10, unitCost: 3 },
      { id: 't2', itemId: 'i1', direction: 'out', quantity: 100, unitCost: 999 },
    ];
    expect(getWeightedAverageCost(inventory, transactions, 'i1')).toBe(2);
  });

  it("falls back to the item's fallback unit cost with no stock at all", () => {
    const inventory = [{ id: 'i1', openingStock: 0, unitCost: 4.5 }];
    expect(getWeightedAverageCost(inventory, [], 'i1')).toBe(4.5);
  });
});

describe('getExpenseUnitCost', () => {
  it('divides expense amount by purchased quantity', () => {
    expect(getExpenseUnitCost({ amount: 105, inventoryQuantity: 150 })).toBeCloseTo(0.7);
  });

  it('returns null when there is no linked quantity', () => {
    expect(getExpenseUnitCost({ amount: 105, inventoryQuantity: null })).toBeNull();
    expect(getExpenseUnitCost(null)).toBeNull();
  });
});

describe('checkOutgoing', () => {
  it('always allows incoming transactions, regardless of balance', () => {
    expect(checkOutgoing({ direction: 'in', itemId: 'i1', quantity: 999 }, [], []).ok).toBe(true);
  });

  it('rejects an outgoing transaction that exceeds available balance', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', unit: 'kg', openingStock: 10 }];
    const result = checkOutgoing({ direction: 'out', itemId: 'i1', quantity: 20 }, inventory, []);
    expect(result.ok).toBe(false);
    expect(result.available).toBe(10);
    expect(result.itemName).toBe('Layer Mash');
  });

  it('allows an outgoing transaction within available balance', () => {
    const inventory = [{ id: 'i1', openingStock: 10 }];
    expect(checkOutgoing({ direction: 'out', itemId: 'i1', quantity: 5 }, inventory, []).ok).toBe(true);
  });
});

describe('normalizeTransaction', () => {
  it('derives unit cost from a linked purchase expense when present', () => {
    const inventory = [{ id: 'i1', unit: 'kg', unitCost: 1 }];
    const expenses = [{ id: 'e1', amount: 105, inventoryQuantity: 150 }];
    const record = normalizeTransaction(
      { itemId: 'i1', transactionType: 'purchase', quantity: 150, expenseId: 'e1' },
      { inventory, expenses, transactions: [] },
    );
    expect(record.unitCost).toBeCloseTo(0.7);
    expect(record.direction).toBe('in');
  });

  it('falls back to weighted-average cost for outgoing transactions with no explicit cost', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 10, unitCost: 2 }];
    const record = normalizeTransaction(
      { itemId: 'i1', transactionType: 'consumption', quantity: 5 },
      { inventory, expenses: [], transactions: [] },
    );
    expect(record.unitCost).toBe(2);
  });

  it('computes a stock-count adjustment as the delta from the current balance', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 10 }];
    const record = normalizeTransaction(
      { itemId: 'i1', transactionType: 'stock_count', countQuantity: 7 },
      { inventory, expenses: [], transactions: [] },
    );
    expect(record.direction).toBe('out');
    expect(record.quantity).toBe(3);
  });

  it('returns null for an item that does not exist', () => {
    const record = normalizeTransaction({ itemId: 'missing', quantity: 5 }, { inventory: [], expenses: [], transactions: [] });
    expect(record).toBeNull();
  });
});
