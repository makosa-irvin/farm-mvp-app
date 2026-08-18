import { describe, it, expect } from 'vitest';
import { fmtMoney, fmtNum, currentCountFor, unitMetrics, unitCostBreakdown, dailyProductionTrend } from '../../src/lib/helpers.js';
import { isInventoryCostDeduction } from '../../src/lib/inventoryLedger.js';

describe('fmtMoney', () => {
  it('formats a positive number as currency', () => {
    expect(fmtMoney(105)).toBe('KSh 105');
  });

  it('supports extra decimal places for per-unit costs', () => {
    expect(fmtMoney(4.6667, 2)).toBe('KSh 4.67');
  });

  it('shows an em dash for null, undefined, or non-finite values', () => {
    expect(fmtMoney(null)).toBe('—');
    expect(fmtMoney(undefined)).toBe('—');
    expect(fmtMoney(NaN)).toBe('—');
  });
});

describe('fmtNum', () => {
  it('formats with the requested number of decimal places', () => {
    expect(fmtNum(45.678, 1)).toBe('45.7');
    expect(fmtNum(45)).toBe('45');
  });
});

describe('currentCountFor', () => {
  it('subtracts total mortality (for this unit only) from the initial count', () => {
    const unit = { id: 'u1', initialCount: 100 };
    const logs = [
      { unitId: 'u1', mortality: 3 },
      { unitId: 'u1', mortality: 2 },
      { unitId: 'other', mortality: 99 },
    ];
    expect(currentCountFor(unit, logs)).toBe(95);
  });

  it('never goes below zero', () => {
    const unit = { id: 'u1', initialCount: 5 };
    expect(currentCountFor(unit, [{ unitId: 'u1', mortality: 10 }])).toBe(0);
  });
});

describe('unitMetrics — the core linking behavior', () => {
  it('excludes inventory-linked expenses from direct cost, using actual consumed cost instead', () => {
    const unit = { id: 'u1', type: 'eggs', initialCount: 100, startDate: '2026-08-01' };
    const logs = [{ unitId: 'u1', date: '2026-08-18', produced: 90, feedKg: 45, mortality: 0 }];
    // A $105 purchase — but only 45kg (at 0.7/kg = $31.50) was actually consumed.
    const expenses = [{ unitId: null, date: '2026-08-17', amount: 105, inventoryItemId: 'i1' }];
    const inventoryMoves = [{ transactionType: 'consumption', direction: 'out', unitId: 'u1', date: '2026-08-18', quantity: 45, unitCost: 0.7 }];

    const metrics = unitMetrics(unit, logs, expenses, 'all', inventoryMoves);
    expect(metrics.directCost).toBeCloseTo(31.5);
  });

  it('counts a plain (non-inventory-linked) expense at its full amount', () => {
    const unit = { id: 'u1', type: 'eggs', initialCount: 100, startDate: '2026-08-01' };
    const logs = [{ unitId: 'u1', date: '2026-08-18', produced: 90, mortality: 0 }];
    const expenses = [{ unitId: 'u1', date: '2026-08-18', amount: 20, inventoryItemId: null }];
    const metrics = unitMetrics(unit, logs, expenses, 'all', []);
    expect(metrics.directCost).toBe(20);
  });

  it('counts consumption transactions attributed to the unit regardless of source (daily-log or manual)', () => {
    const unit = { id: 'u1', type: 'eggs', initialCount: 100, startDate: '2026-08-01' };
    const logs = [{ unitId: 'u1', date: '2026-08-18', produced: 90, mortality: 0 }];
    const manualConsumption = [{ transactionType: 'consumption', direction: 'out', source: 'manual', unitId: 'u1', date: '2026-08-18', quantity: 10, unitCost: 1 }];
    const metrics = unitMetrics(unit, logs, [], 'all', manualConsumption);
    expect(metrics.directCost).toBe(10);
  });
});

describe('unitCostBreakdown', () => {
  const unit = { id: 'u1' };

  it('groups plain (non-inventory-linked) expenses by category', () => {
    const expenses = [
      { unitId: 'u1', date: '2026-08-01', category: 'feed', amount: 500, inventoryItemId: null },
      { unitId: 'u1', date: '2026-08-02', category: 'labor', amount: 200, inventoryItemId: null },
      { unitId: 'u1', date: '2026-08-03', category: 'feed', amount: 100, inventoryItemId: null },
    ];
    const rows = unitCostBreakdown(unit, [], expenses, 'all', [], []);
    expect(rows).toEqual([
      { label: 'Feed', amount: 600 },
      { label: 'Labor', amount: 200 },
    ]);
  });

  it('excludes expenses that already moved through an inventory purchase, so they are not double-counted', () => {
    const expenses = [
      { unitId: 'u1', date: '2026-08-01', category: 'feed', amount: 500, inventoryItemId: 'i1' },
    ];
    const rows = unitCostBreakdown(unit, [], expenses, 'all', [], []);
    expect(rows).toEqual([]);
  });

  it('attributes consumed inventory cost to the inventory item\'s own category', () => {
    const inventory = [{ id: 'i1', category: 'Feed' }];
    const inventoryMoves = [
      { transactionType: 'consumption', direction: 'out', unitId: 'u1', date: '2026-08-05', itemId: 'i1', quantity: 10, unitCost: 7 },
    ];
    const rows = unitCostBreakdown(unit, [], [], 'all', inventoryMoves, inventory);
    expect(rows).toEqual([{ label: 'Feed', amount: 70 }]);
  });

  it('merges a plain "feed" expense and consumed "Feed" inventory into one Feed bucket', () => {
    const inventory = [{ id: 'i1', category: 'Feed' }];
    const expenses = [{ unitId: 'u1', date: '2026-08-01', category: 'feed', amount: 100, inventoryItemId: null }];
    const inventoryMoves = [
      { transactionType: 'consumption', direction: 'out', unitId: 'u1', date: '2026-08-05', itemId: 'i1', quantity: 5, unitCost: 8 },
    ];
    const rows = unitCostBreakdown(unit, [], expenses, 'all', inventoryMoves, inventory);
    expect(rows).toEqual([{ label: 'Feed', amount: 140 }]); // 100 + 5*8
  });

  it('sorts largest first and drops zero/negative rows', () => {
    const expenses = [
      { unitId: 'u1', date: '2026-08-01', category: 'labor', amount: 50, inventoryItemId: null },
      { unitId: 'u1', date: '2026-08-02', category: 'utilities', amount: 300, inventoryItemId: null },
      { unitId: 'u1', date: '2026-08-03', category: 'capital', amount: 0, inventoryItemId: null },
    ];
    const rows = unitCostBreakdown(unit, [], expenses, 'all', [], []);
    expect(rows.map((r) => r.label)).toEqual(['Utilities', 'Labor']);
  });

  it('ignores expenses and consumption for other units', () => {
    const expenses = [{ unitId: 'u2', date: '2026-08-01', category: 'feed', amount: 999, inventoryItemId: null }];
    const rows = unitCostBreakdown(unit, [], expenses, 'all', [], []);
    expect(rows).toEqual([]);
  });
});

describe('dailyProductionTrend', () => {
  const unit = { id: 'u1' };

  it('returns exactly `days` entries even with no logs, all zero', () => {
    const trend = dailyProductionTrend(unit, [], 7);
    expect(trend).toHaveLength(7);
    expect(trend.every((row) => row.value === 0)).toBe(true);
  });

  it('sums same-day production and orders oldest first', () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const logs = [
      { unitId: 'u1', date: yesterday, produced: 10 },
      { unitId: 'u1', date: today, produced: 20 },
      { unitId: 'u1', date: today, produced: 5 }, // a second entry same day, same unit
    ];
    const trend = dailyProductionTrend(unit, logs, 3);
    expect(trend.at(-1)).toEqual({ date: today, value: 25 });
    expect(trend.at(-2)).toEqual({ date: yesterday, value: 10 });
  });

  it('ignores logs for other units', () => {
    const today = new Date().toISOString().slice(0, 10);
    const logs = [{ unitId: 'u2', date: today, produced: 999 }];
    const trend = dailyProductionTrend(unit, logs, 1);
    expect(trend[0].value).toBe(0);
  });

  it('a day with no entry is a real zero, not missing from the array', () => {
    const trend = dailyProductionTrend(unit, [], 1);
    expect(trend).toHaveLength(1);
    expect(trend[0].value).toBe(0);
  });
});

// Regression coverage for a confirmed backward-compatibility gap:
// isInventoryCostDeduction() used to check transaction.direction alone,
// with no fallback to transaction.type. This app has no backend and no
// data migrations — an existing user's already-stored transactions from
// before `direction` existed as a field may only have `type` set. Without
// the fallback, a real user's genuine historical costs would silently
// stop counting the moment they loaded a newer build, with no error and
// no explanation. Every other balance calculation in this codebase
// (getBalance, the InventoryView balance calc) already checks
// (move.direction || move.type) for exactly this reason.
describe('isInventoryCostDeduction — backward compatibility with older stored data', () => {
  it('recognizes a deduction using the current `direction` field', () => {
    expect(isInventoryCostDeduction({ transactionType: 'wastage', direction: 'out' })).toBe(true);
  });

  it('also recognizes a deduction using only the older `type` field, with no `direction` set', () => {
    expect(isInventoryCostDeduction({ transactionType: 'wastage', type: 'out' })).toBe(true);
  });

  it('still correctly excludes transfers and sales regardless of which field is used', () => {
    expect(isInventoryCostDeduction({ transactionType: 'transfer', direction: 'out' })).toBe(false);
    expect(isInventoryCostDeduction({ transactionType: 'sale', type: 'out' })).toBe(false);
  });
});
