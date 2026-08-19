import { describe, expect, it } from 'vitest';
import { getBalance, getWeightedAverageCost } from '../../src/lib/inventoryLedger.js';

describe('imported inventory history', () => {
  const inventory = [{ id: 'feed-1', name: 'Layer Mash', unit: 'kg', openingStock: 0, unitCost: 62 }];
  const transactions = [
    { id: 't1', itemId: 'feed-1', transactionType: 'purchase', direction: 'in', quantity: 500, unitCost: 62, date: '2024-08-20' },
    { id: 't2', itemId: 'feed-1', transactionType: 'purchase', direction: 'in', quantity: 600, unitCost: 70, date: '2025-01-05' },
    { id: 't3', itemId: 'feed-1', transactionType: 'consumption', direction: 'out', quantity: 250, unitCost: 66.36, date: '2025-01-20' },
    { id: 't4', itemId: 'feed-1', transactionType: 'wastage', direction: 'out', quantity: 10, unitCost: 66.36, date: '2025-02-01' },
  ];

  it('calculates current stock from the complete movement history', () => {
    expect(getBalance(inventory, transactions, 'feed-1')).toBe(840);
  });

  it('calculates weighted average cost from historical stock-in movements', () => {
    expect(getWeightedAverageCost(inventory, transactions, 'feed-1')).toBeCloseTo((500 * 62 + 600 * 70) / 1100, 4);
  });
});
