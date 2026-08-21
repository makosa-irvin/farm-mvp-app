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
    // 1300 in pure cash expenses (labor 1000 + medicine 300 — none of
    // this fixture's expenses are linked to a stock purchase) plus 5700
    // in real inventory-deduction cost from the ledger: dm consumption
    // 50*60=3000 (dairy) + bran consumption 20*30=600 (dairy) + dm
    // wastage 5*60=300 (dairy) + dm consumption 30*60=1800 (layers) =
    // 5700. Total 7000.
    //
    // This function used to never include inventory-deduction cost at
    // all — a real gap distinct from (but alongside) the purchase
    // double-counting bug it also had: buying stock counted at full
    // price immediately, and what was actually consumed or lost was
    // never counted anywhere in this total. Both are fixed together now:
    // a cash expense linked to a stock purchase is excluded from the
    // direct sum (this fixture doesn't exercise that path, since none of
    // its expenses are purchase-linked), and the real ledger-derived
    // deduction cost is added in its place — matching the same accrual
    // approach already used in unitMetrics()/unitCostBreakdown()
    // (helpers.js) and Dashboard's "Farm costs" figure.
    expect(expenses.total).toBe(7000);
    expect(expenses.byType.find(r=>r.type==='labor').amount).toBe(1000);
    expect(expenses.byType.find(r=>r.type==='stock used or lost').amount).toBe(5700);
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

describe('expense analysis — purchase double-counting regression', () => {
  it('excludes a stock purchase from direct cost, using the real consumed cost instead', () => {
    // Bought 50kg of feed for KSh 3,500 — a real cash expense, linked to
    // stock. Only 5kg (KSh 350 at KSh 70/kg) has actually been consumed
    // so far. Before this fix, buildExpenseAnalysis summed every
    // expense's raw amount unconditionally, so this showed KSh 3,500 the
    // moment the purchase was recorded — the full price, regardless of
    // how much had actually been used. This fixture is what the earlier
    // test above didn't cover: none of its expenses were purchase-linked,
    // so it never exercised this exact path.
    const purchaseData = {
      units: [], logs: [],
      expenses: [{ id: 'e1', category: 'feed', amount: 3500, date: '2026-08-01', unitId: null, inventoryItemId: 'i1', inventoryQuantity: 50 }],
      inventory: [{ id: 'i1', category: 'Feed' }],
      inventoryMoves: [
        { id: 'exppurchase_e1', itemId: 'i1', transactionType: 'purchase', direction: 'in', quantity: 50, unitCost: 70, date: '2026-08-01', source: 'expense-purchase', sourceId: 'e1' },
        { id: 'logfeed_l1', itemId: 'i1', transactionType: 'consumption', direction: 'out', quantity: 5, unitCost: 70, date: '2026-08-02', source: 'daily-log', sourceId: 'l1', unitId: 'u1' },
      ],
    };
    const result = buildExpenseAnalysis(purchaseData);
    expect(result.total).toBe(350);
  });
});
