import { describe, it, expect } from 'vitest';
import { filterAnalyticsData, buildFeedAnalysis, buildExpenseAnalysis, buildProductionAnalysis, buildYearOverYear } from '../../src/lib/analytics.js';

const data = {
  units: [{ id:'dairy', name:'Dairy Cows', initialCount:10 }, { id:'layers', name:'Layer Chickens', initialCount:20 }],
  inventory: [{ id:'dm', name:'Dairy Meal', category:'Feed', unit:'kg' }, { id:'bran', name:'Maize Bran', category:'Feed', unit:'kg' }, { id:'med', name:'Medicine', category:'Medicine', unit:'bottle' }],
  logs: [{ unitId:'dairy', date:'2025-01-05', produced:100, mortality:0 }, { unitId:'layers', date:'2025-01-05', produced:400, mortality:1 }, { unitId:'dairy', date:'2026-01-05', produced:120, mortality:1 }],
  expenses: [{ unitId:'dairy', date:'2025-01-05', category:'labor', amount:1000 }, { unitId:'dairy', date:'2026-01-05', category:'labor', amount:1500 }, { unitId:'layers', date:'2025-01-05', category:'medicine', amount:300 }],
  inventoryMoves: [
    { unitId:'dairy', itemId:'dm', date:'2025-01-05', transactionType:'consumption', direction:'out', quantity:50, unitCost:60 },
    { unitId:'dairy', itemId:'bran', date:'2025-01-06', transactionType:'consumption', direction:'out', quantity:20, unitCost:30 },
    { unitId:'dairy', itemId:'dm', date:'2025-01-07', transactionType:'wastage', direction:'out', quantity:5, unitCost:60 },
    { unitId:'layers', itemId:'dm', date:'2025-01-05', transactionType:'consumption', direction:'out', quantity:30, unitCost:60 },
  ],
};

describe('analytics filtering', () => {
  it('filters by farm group, date, item and expense type', () => {
    const result = filterAnalyticsData(data, { unitId:'dairy', itemId:'dm', expenseType:'labor', startDate:'2025-01-01', endDate:'2025-12-31' });
    expect(result.units.map(u=>u.id)).toEqual(['dairy']);
    expect(result.logs).toHaveLength(1);
    expect(result.inventoryMoves).toHaveLength(2);
    expect(result.expenses).toHaveLength(1);
  });
});

describe('feed analysis', () => {
  it('separates consumption, purchases, wastage and cost from real inventory movements', () => {
    const result = buildFeedAnalysis(data, { unitId:'dairy', startDate:'2025-01-01', endDate:'2025-12-31' });
    expect(result.consumption).toBe(70);
    expect(result.wastage).toBe(5);
    expect(result.feedCost).toBe(3600);
    expect(result.rows.find(r=>r.name==='Dairy Meal').consumed).toBe(50);
  });
});

describe('expense and production analysis', () => {
  it('groups expenses by type and production by month', () => {
    const expenses = buildExpenseAnalysis(data, { startDate:'2025-01-01', endDate:'2025-12-31' });
    expect(expenses.total).toBe(1300);
    expect(expenses.byType.find(r=>r.type==='labor').amount).toBe(1000);
    const production = buildProductionAnalysis(data, { unitId:'dairy', startDate:'2025-01-01', endDate:'2025-12-31' });
    expect(production.total).toBe(100);
    expect(production.byMonth).toEqual([{ month:'2025-01', value:100 }]);
  });
});

describe('year over year', () => {
  it('compares the selected period with the same period one year earlier', () => {
    const result = buildYearOverYear(data, { unitId:'dairy', startDate:'2026-01-01', endDate:'2026-12-31' });
    expect(result.current.production).toBe(120);
    expect(result.prior.production).toBe(100);
    expect(result.change.production).toBeCloseTo(20);
  });
});
