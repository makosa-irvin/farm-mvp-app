import { describe, it, expect } from 'vitest';
import {
  filterAnalyticsData,
  buildFeedAnalysis,
  buildExpenseAnalysis,
  buildProductionAnalysis,
  buildYearOverYear,
  buildRevenueAnalysis,
  buildItemCostTrend,
} from '../../src/lib/analytics.js';

const data = {
  units: [
    { id: 'dairy', name: 'Dairy Cows', initialCount: 10 },
    { id: 'layers', name: 'Layer Chickens', initialCount: 20 },
  ],
  inventory: [
    { id: 'dm', name: 'Dairy Meal', category: 'Feed', unit: 'kg' },
    { id: 'bran', name: 'Maize Bran', category: 'Feed', unit: 'kg' },
    { id: 'med', name: 'Medicine', category: 'Medicine', unit: 'bottle' },
  ],
  logs: [
    { unitId: 'dairy', date: '2025-01-05', produced: 100, mortality: 0 },
    { unitId: 'layers', date: '2025-01-05', produced: 400, mortality: 1 },
    { unitId: 'dairy', date: '2026-01-05', produced: 120, mortality: 1 },
  ],
  expenses: [
    { unitId: 'dairy', date: '2025-01-05', category: 'labor', amount: 1000 },
    { unitId: 'dairy', date: '2026-01-05', category: 'labor', amount: 1500 },
    { unitId: 'layers', date: '2025-01-05', category: 'medicine', amount: 300 },
  ],
  inventoryMoves: [
    { unitId: 'dairy', itemId: 'dm', date: '2025-01-05', transactionType: 'consumption', direction: 'out', quantity: 50, unitCost: 60 },
    { unitId: 'dairy', itemId: 'bran', date: '2025-01-06', transactionType: 'consumption', direction: 'out', quantity: 20, unitCost: 30 },
    { unitId: 'dairy', itemId: 'dm', date: '2025-01-07', transactionType: 'wastage', direction: 'out', quantity: 5, unitCost: 60 },
    { unitId: 'layers', itemId: 'dm', date: '2025-01-05', transactionType: 'consumption', direction: 'out', quantity: 30, unitCost: 60 },
  ],
};

describe('analytics filtering', () => {
  it('filters by farm group, date, item and expense type', () => {
    const result = filterAnalyticsData(data, {
      unitId: 'dairy',
      itemId: 'dm',
      expenseType: 'labor',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
    expect(result.units.map((u) => u.id)).toEqual(['dairy']);
    expect(result.logs).toHaveLength(1);
    expect(result.inventoryMoves).toHaveLength(2);
    expect(result.expenses).toHaveLength(1);
  });
});

describe('feed analysis', () => {
  it('separates consumption, purchases, wastage and cost from real inventory movements', () => {
    const result = buildFeedAnalysis(data, { unitId: 'dairy', startDate: '2025-01-01', endDate: '2025-12-31' });
    expect(result.consumption).toBe(70);
    expect(result.wastage).toBe(5);
    expect(result.feedCost).toBe(3600);
    expect(result.rows.find((r) => r.name === 'Dairy Meal').consumed).toBe(50);
  });
});

describe('expense and production analysis', () => {
  it('groups expenses by type and production by month', () => {
    const expenses = buildExpenseAnalysis(data, { startDate: '2025-01-01', endDate: '2025-12-31' });
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
    expect(expenses.byType.find((r) => r.type === 'labor').amount).toBe(1000);
    expect(expenses.byType.find((r) => r.type === 'stock used or lost').amount).toBe(5700);
    const production = buildProductionAnalysis(data, { unitId: 'dairy', startDate: '2025-01-01', endDate: '2025-12-31' });
    expect(production.total).toBe(100);
    expect(production.byMonth).toEqual([{ month: '2025-01', value: 100 }]);
  });
});

describe('year over year', () => {
  it('compares the selected period with the same period one year earlier', () => {
    const result = buildYearOverYear(data, { unitId: 'dairy', startDate: '2026-01-01', endDate: '2026-12-31' });
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
      units: [],
      logs: [],
      expenses: [
        { id: 'e1', category: 'feed', amount: 3500, date: '2026-08-01', unitId: null, inventoryItemId: 'i1', inventoryQuantity: 50 },
      ],
      inventory: [{ id: 'i1', category: 'Feed' }],
      inventoryMoves: [
        {
          id: 'exppurchase_e1',
          itemId: 'i1',
          transactionType: 'purchase',
          direction: 'in',
          quantity: 50,
          unitCost: 70,
          date: '2026-08-01',
          source: 'expense-purchase',
          sourceId: 'e1',
        },
        {
          id: 'logfeed_l1',
          itemId: 'i1',
          transactionType: 'consumption',
          direction: 'out',
          quantity: 5,
          unitCost: 70,
          date: '2026-08-02',
          source: 'daily-log',
          sourceId: 'l1',
          unitId: 'u1',
        },
      ],
    };
    const result = buildExpenseAnalysis(purchaseData);
    expect(result.total).toBe(350);
  });
});

describe('buildRevenueAnalysis — real vs. estimated revenue, farm-wide', () => {
  const units = [{ id: 'u1', name: 'Layer House A', type: 'eggs', initialCount: 100, startDate: '2026-08-01', producePrice: 300 }];

  it('uses real sold quantities when logs track disposition', () => {
    const logs = [{ unitId: 'u1', date: '2026-08-01', produced: 30, sold: 28, mortality: 0 }];
    const result = buildRevenueAnalysis({ units, logs, expenses: [], inventory: [], inventoryMoves: [] });
    expect(result.actualRevenue).toBeCloseTo((28 / 30) * 300);
    expect(result.estimatedRevenue).toBe(0);
    expect(result.trackedEntries).toBe(1);
  });

  it('falls back to the produced-based estimate for entries that never tracked disposition', () => {
    const logs = [{ unitId: 'u1', date: '2026-08-01', produced: 30, mortality: 0 }];
    const result = buildRevenueAnalysis({ units, logs, expenses: [], inventory: [], inventoryMoves: [] });
    expect(result.estimatedRevenue).toBeCloseTo(300);
    expect(result.actualRevenue).toBe(0);
    expect(result.trackedEntries).toBe(0);
  });

  it('computes profit as revenue minus the same accrual-correct direct cost used elsewhere', () => {
    const logs = [{ unitId: 'u1', date: '2026-08-01', produced: 30, sold: 30, mortality: 0 }];
    const expenses = [{ unitId: 'u1', date: '2026-08-01', amount: 100, inventoryItemId: null }];
    const result = buildRevenueAnalysis({ units, logs, expenses, inventory: [], inventoryMoves: [] });
    expect(result.directCost).toBe(100);
    expect(result.profit).toBeCloseTo(300 - 100);
  });
});

describe('buildItemCostTrend — surfacing a mid-period item substitution', () => {
  it('shows the exact scenario this was built for: switching from a cheaper feed to a pricier one partway through a period', () => {
    // Feed B (cheap, 60/kg) used through week 1, then it ran out and
    // Feed A (pricier, 90/kg) covers the rest — the switch should be
    // visible week by week, not flattened into one period average.
    const inventory = [
      { id: 'feedA', name: 'Feed A', unit: 'kg' },
      { id: 'feedB', name: 'Feed B', unit: 'kg' },
    ];
    const inventoryMoves = [
      { itemId: 'feedB', transactionType: 'consumption', direction: 'out', quantity: 20, unitCost: 60, date: '2026-08-03' },
      { itemId: 'feedA', transactionType: 'consumption', direction: 'out', quantity: 20, unitCost: 90, date: '2026-08-17' },
    ];
    const trend = buildItemCostTrend({ units: [], logs: [], expenses: [], inventory, inventoryMoves });

    const feedA = trend.find((t) => t.name === 'Feed A');
    const feedB = trend.find((t) => t.name === 'Feed B');
    expect(feedB.weeks[0].avgUnitCost).toBe(60);
    expect(feedA.weeks[0].avgUnitCost).toBe(90);
    // The two items' weeks don't overlap — confirming the substitution
    // is a clean handoff, visible as two distinct, separate periods.
    expect(feedB.weeks.some((w) => w.week === feedA.weeks[0].week)).toBe(false);
  });

  it('computes average unit cost per week, not just a period-wide blend', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', unit: 'kg' }];
    const inventoryMoves = [
      { itemId: 'i1', transactionType: 'consumption', direction: 'out', quantity: 10, unitCost: 50, date: '2026-08-03' },
      { itemId: 'i1', transactionType: 'consumption', direction: 'out', quantity: 10, unitCost: 70, date: '2026-08-04' },
    ];
    const trend = buildItemCostTrend({ units: [], logs: [], expenses: [], inventory, inventoryMoves });
    // Same week — should blend to the weighted average (50+70)/2 = 60.
    expect(trend[0].weeks).toHaveLength(1);
    expect(trend[0].weeks[0].avgUnitCost).toBe(60);
  });

  it('ignores a purchase transaction — this is about cost actually incurred (consumption/wastage), not stock arriving', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', unit: 'kg' }];
    const inventoryMoves = [{ itemId: 'i1', transactionType: 'purchase', direction: 'in', quantity: 50, unitCost: 70, date: '2026-08-01' }];
    const trend = buildItemCostTrend({ units: [], logs: [], expenses: [], inventory, inventoryMoves });
    expect(trend).toEqual([]);
  });

  it('returns items sorted alphabetically by name', () => {
    const inventory = [
      { id: 'i1', name: 'Zinc Supplement', unit: 'kg' },
      { id: 'i2', name: 'Antibiotic', unit: 'ml' },
    ];
    const inventoryMoves = [
      { itemId: 'i1', transactionType: 'consumption', direction: 'out', quantity: 1, unitCost: 10, date: '2026-08-01' },
      { itemId: 'i2', transactionType: 'consumption', direction: 'out', quantity: 1, unitCost: 10, date: '2026-08-01' },
    ];
    const trend = buildItemCostTrend({ units: [], logs: [], expenses: [], inventory, inventoryMoves });
    expect(trend.map((t) => t.name)).toEqual(['Antibiotic', 'Zinc Supplement']);
  });
});
