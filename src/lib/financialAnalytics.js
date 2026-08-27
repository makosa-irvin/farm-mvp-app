import { filterAnalyticsData, buildExpenseAnalysis } from './analytics.js';
import { typeOf } from './helpers.js';

const num = (value) => Number(value) || 0;

export function buildFinancialAnalysis(data, filters = {}) {
  const filtered = filterAnalyticsData(data, filters);
  const expense = buildExpenseAnalysis(data, filters);
  const unitsById = new Map(data.units.map((unit) => [unit.id, unit]));
  const revenue = filtered.logs.reduce((sum, log) => {
    const unit = unitsById.get(log.unitId);
    if (!unit) return sum;
    const price = num(unit.producePrice);
    const groupSize = num(typeOf(unit).groupSize) || 1;
    return sum + (num(log.produced) / groupSize) * price;
  }, 0);
  return { revenue, expenses: expense.total, profit: revenue - expense.total };
}
