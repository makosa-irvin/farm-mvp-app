import { describe, it, expect } from 'vitest';
import { fmtMoney, fmtNum, currentCountFor, unitMetrics } from '../../src/lib/helpers.js';

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
    const inventoryMoves = [{ transactionType: 'consumption', unitId: 'u1', date: '2026-08-18', quantity: 45, unitCost: 0.7 }];

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
    const manualConsumption = [{ transactionType: 'consumption', source: 'manual', unitId: 'u1', date: '2026-08-18', quantity: 10, unitCost: 1 }];
    const metrics = unitMetrics(unit, logs, [], 'all', manualConsumption);
    expect(metrics.directCost).toBe(10);
  });
});
