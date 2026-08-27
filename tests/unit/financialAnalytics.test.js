import { describe, expect, it } from 'vitest';
import { buildFinancialAnalysis } from '../../src/lib/financialAnalytics.js';

describe('financial analytics', () => {
  it('calculates revenue from production prices and profit after accrued costs', () => {
    const data = {
      units: [{ id: 'cow', type: 'milk', producePrice: 60 }],
      logs: [{ unitId: 'cow', date: '2026-08-01', produced: 100 }],
      expenses: [{ unitId: 'cow', date: '2026-08-01', category: 'labor', amount: 1000 }],
      inventory: [], inventoryMoves: [],
    };
    const result = buildFinancialAnalysis(data, { startDate: '2026-08-01', endDate: '2026-08-31' });
    expect(result.revenue).toBe(6000);
    expect(result.expenses).toBe(1000);
    expect(result.profit).toBe(5000);
  });
});
