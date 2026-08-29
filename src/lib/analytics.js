import { isInventoryCostDeduction, inventoryTransactionCost } from './inventoryLedger.js';
import { typeOf } from './helpers.js';

const asDate = (value) => new Date(`${value}T00:00:00`);
const num = (value) => Number(value) || 0;

// Splits an expenses array into real cash payments and the app's
// auto-generated non-cash entries (stock used or lost — see
// buildInventoryCostExpense in inventoryActions.js). Both carry
// `inventoryItemId`, since that field marks any expense linked to
// inventory in either direction (a purchase creating stock, or a
// deduction generated from stock already in the ledger) — this is the
// same exclusion rule unitMetrics()/unitCostBreakdown() already use
// correctly in helpers.js. The point: neither a cash purchase nor its own
// non-cash "used/lost" echo should be summed by amount directly, since
// the true accrued cost — what to actually count as spent, whether or
// not the full purchase has been consumed yet — is computed fresh from
// the inventory ledger via isInventoryCostDeduction/inventoryTransactionCost
// instead. Summing every row's `amount` directly (the bug this fixes)
// double-counts: a KSh 3,500 feed purchase shows as a KSh 3,500 cost
// immediately, and the KSh 350 actually consumed shows again on top.
function directCashExpenses(expenses) {
  return expenses.filter((e) => !e.inventoryItemId);
}

export function filterAnalyticsData({ units = [], logs = [], expenses = [], inventory = [], inventoryMoves = [] }, filters = {}) {
  const start = filters.startDate ? asDate(filters.startDate) : null;
  const end = filters.endDate ? asDate(filters.endDate) : null;
  const unitId = filters.unitId || 'all';
  const itemId = filters.itemId || 'all';
  const expenseType = filters.expenseType || 'all';
  const inRange = (date) => {
    if (!date) return false;
    const d = asDate(date);
    return (!start || d >= start) && (!end || d <= end);
  };
  return {
    units: units.filter((u) => unitId === 'all' || u.id === unitId),
    logs: logs.filter((l) => inRange(l.date) && (unitId === 'all' || l.unitId === unitId)),
    expenses: expenses.filter(
      (e) =>
        inRange(e.date) &&
        (unitId === 'all' || e.unitId === unitId) &&
        (expenseType === 'all' || (e.category || e.expenseType || 'other') === expenseType),
    ),
    inventory: inventory.filter((i) => itemId === 'all' || i.id === itemId),
    inventoryMoves: inventoryMoves.filter(
      (m) => inRange(m.date) && (unitId === 'all' || m.unitId === unitId) && (itemId === 'all' || m.itemId === itemId),
    ),
  };
}

export function availableYears(data) {
  const dates = [...data.logs, ...data.expenses, ...data.inventoryMoves].map((x) => x.date).filter(Boolean);
  return [...new Set(dates.map((d) => asDate(d).getFullYear()))].sort((a, b) => b - a);
}

function groupByMonth(rows, value) {
  const map = new Map();
  rows.forEach((row) => {
    const key = row.date.slice(0, 7);
    map.set(key, (map.get(key) || 0) + value(row));
  });
  return [...map.entries()].sort().map(([month, value]) => ({ month, value }));
}

// ISO-ish week key (year + week number) — good enough for grouping and
// sorting chronologically without pulling in a date library. Used for
// the item-cost trend below, since a month is often too coarse to show
// a mid-month substitution (e.g. switching feed suppliers 14 days into
// a 30-day month) — by week, that shift is visible as a distinct step.
function weekKey(dateStr) {
  const d = asDate(dateStr);
  const firstJan = new Date(d.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((d - firstJan) / 86400000) + 1;
  const week = Math.ceil((dayOfYear + firstJan.getDay()) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Real money made, not just an estimate — mirrors the exact per-entry
// real/estimated logic already proven in unitMetrics() (helpers.js):
// when a log records how much was actually sold, that entry's
// contribution to revenue is real; when it doesn't (an entry from
// before this was tracked, or a farmer who skips it some days), that
// entry falls back to the previous produced-based estimate. Aggregated
// here across every unit the current filter includes, rather than one
// unit at a time.
export function buildRevenueAnalysis(data, filters = {}) {
  const d = filterAnalyticsData(data, filters);
  let actualRevenue = 0;
  let estimatedRevenue = 0;
  let trackedEntries = 0;

  d.logs.forEach((log) => {
    const unit = d.units.find((u) => u.id === log.unitId);
    if (!unit) return;
    const unitType = typeOf(unit);
    const usualPrice = Number(unit.producePrice) || 0;
    const hasSold = log.sold !== undefined && log.sold !== null && log.sold !== '';
    const price = hasSold && Number(log.salePrice) > 0 ? Number(log.salePrice) : usualPrice;
    if (price <= 0) return;
    if (hasSold) {
      trackedEntries += 1;
      const qty = Number(log.sold) || 0;
      if (qty > 0) actualRevenue += (qty / unitType.groupSize) * price;
    } else {
      const qty = Number(log.produced) || 0;
      if (qty > 0) estimatedRevenue += (qty / unitType.groupSize) * price;
    }
  });

  const revenue = actualRevenue + estimatedRevenue;
  const directCost = directCashExpenses(d.expenses).reduce((s, e) => s + num(e.amount), 0) +
    d.inventoryMoves.filter(isInventoryCostDeduction).reduce((s, m) => s + inventoryTransactionCost(m), 0);

  return {
    revenue,
    actualRevenue,
    estimatedRevenue,
    // How much of the revenue figure rests on entries that actually
    // recorded a sale, vs. entries this had to estimate — a caller can
    // use this to show something like "based on 12 of 30 days' real
    // sales" rather than presenting a blended figure as more precise
    // than it is.
    trackedEntries,
    totalEntries: d.logs.length,
    directCost,
    profit: revenue - directCost,
  };
}

export function buildFeedAnalysis(data, filters = {}) {
  const d = filterAnalyticsData(data, filters);
  const feedIds = new Set(d.inventory.filter((i) => String(i.category || '').toLowerCase() === 'feed').map((i) => i.id));
  const moves = d.inventoryMoves.filter((m) => feedIds.has(m.itemId));
  const consumption = moves.filter((m) => m.transactionType === 'consumption' && (m.direction || m.type) === 'out');
  const wastage = moves.filter((m) => m.transactionType === 'wastage' && (m.direction || m.type) === 'out');
  const purchases = moves.filter((m) => m.transactionType === 'purchase' && (m.direction || m.type) === 'in');

  const rows = d.inventory
    .filter((i) => feedIds.has(i.id))
    .map((item) => {
      const itemMoves = moves.filter((m) => m.itemId === item.id);
      const consumedQty = itemMoves.filter((m) => m.transactionType === 'consumption').reduce((s, m) => s + num(m.quantity), 0);
      const itemCost = itemMoves.filter(isInventoryCostDeduction).reduce((s, m) => s + inventoryTransactionCost(m), 0);
      return {
        id: item.id,
        name: item.name,
        unit: item.unit || 'units',
        consumed: consumedQty,
        wastage: itemMoves.filter((m) => m.transactionType === 'wastage').reduce((s, m) => s + num(m.quantity), 0),
        purchased: itemMoves.filter((m) => m.transactionType === 'purchase').reduce((s, m) => s + num(m.quantity), 0),
        cost: itemCost,
        // Cost per unit actually consumed — this is what makes "Feed A
        // costs more than Feed B" visible directly on this row, not
        // something a farmer has to work out by dividing two other
        // numbers themselves.
        avgUnitCost: consumedQty > 0 ? itemCost / consumedQty : null,
      };
    });

  const feedCost = consumption.reduce((s, m) => s + inventoryTransactionCost(m), 0);
  const consumed = consumption.reduce((s, m) => s + num(m.quantity), 0);
  const produced = d.logs.reduce((s, l) => s + num(l.produced), 0);
  const totalAnimals = d.units.reduce((s, u) => s + num(u.initialCount), 0);
  const animalDays = d.units.reduce((sum, u) => {
    const unitDays = d.logs.filter((l) => l.unitId === u.id).length || 1;
    const mortality = d.logs.filter((l) => l.unitId === u.id).reduce((s, l) => s + num(l.mortality), 0);
    return sum + Math.max(0, num(u.initialCount) - mortality) * unitDays;
  }, 0);
  const monthly = groupByMonth(consumption, (m) => num(m.quantity));

  return {
    rows,
    consumption: consumed,
    purchases: purchases.reduce((s, m) => s + num(m.quantity), 0),
    wastage: wastage.reduce((s, m) => s + num(m.quantity), 0),
    feedCost,
    produced,
    totalAnimals,
    avgMonthlyConsumption: monthly.length ? monthly.reduce((s, r) => s + r.value, 0) / monthly.length : 0,
    consumptionPerAnimal: totalAnimals ? consumed / totalAnimals : 0,
    costPerAnimal: totalAnimals ? feedCost / totalAnimals : 0,
    feedCostPerAnimalDay: animalDays ? feedCost / animalDays : 0,
    feedCostPerProduction: produced ? feedCost / produced : 0,
    monthly,
  };
}

// Per-item, per-week consumption and cost — this is what actually makes
// a substitution visible (e.g. running out of a cheaper feed partway
// through the month and switching to a pricier one for the remaining
// days), which a single period-wide total or average necessarily
// flattens away. Not limited to feed — covers every category, since the
// same "which specific item drove the cost, and when" question applies
// to medicine, seed, or anything else tracked.
export function buildItemCostTrend(data, filters = {}) {
  const d = filterAnalyticsData(data, filters);
  const deductions = d.inventoryMoves.filter(isInventoryCostDeduction);

  // itemId -> weekKey -> { quantity, cost }
  const byItem = new Map();
  deductions.forEach((move) => {
    const item = d.inventory.find((i) => i.id === move.itemId);
    if (!item) return;
    if (!byItem.has(item.id)) byItem.set(item.id, { id: item.id, name: item.name, unit: item.unit || 'units', weeks: new Map() });
    const entry = byItem.get(item.id);
    const key = weekKey(move.date);
    const existing = entry.weeks.get(key) || { week: key, quantity: 0, cost: 0 };
    existing.quantity += num(move.quantity);
    existing.cost += inventoryTransactionCost(move);
    entry.weeks.set(key, existing);
  });

  return [...byItem.values()]
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      unit: entry.unit,
      weeks: [...entry.weeks.values()].sort((a, b) => (a.week < b.week ? -1 : 1)).map((w) => ({
        ...w,
        avgUnitCost: w.quantity > 0 ? w.cost / w.quantity : null,
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildExpenseAnalysis(data, filters = {}) {
  const d = filterAnalyticsData(data, filters);
  const cashExpenses = directCashExpenses(d.expenses);
  const deductions = d.inventoryMoves.filter(isInventoryCostDeduction);

  const byType = new Map();
  cashExpenses.forEach((e) => {
    const key = e.category || e.expenseType || 'other';
    byType.set(key, (byType.get(key) || 0) + num(e.amount));
  });
  const deductionCost = deductions.reduce((s, m) => s + inventoryTransactionCost(m), 0);
  if (deductionCost > 0) byType.set('stock used or lost', (byType.get('stock used or lost') || 0) + deductionCost);

  const byMonthMap = new Map();
  cashExpenses.forEach((e) => {
    const key = e.date.slice(0, 7);
    byMonthMap.set(key, (byMonthMap.get(key) || 0) + num(e.amount));
  });
  deductions.forEach((m) => {
    const key = m.date.slice(0, 7);
    byMonthMap.set(key, (byMonthMap.get(key) || 0) + inventoryTransactionCost(m));
  });

  return {
    total: cashExpenses.reduce((s, e) => s + num(e.amount), 0) + deductionCost,
    byType: [...byType.entries()].map(([type, amount]) => ({ type, amount })).sort((a, b) => b.amount - a.amount),
    byMonth: [...byMonthMap.entries()].sort().map(([month, value]) => ({ month, value })),
  };
}

export function buildProductionAnalysis(data, filters = {}) {
  const d = filterAnalyticsData(data, filters);
  return {
    total: d.logs.reduce((s, l) => s + num(l.produced), 0),
    loss: d.logs.reduce((s, l) => s + num(l.loss), 0),
    mortality: d.logs.reduce((s, l) => s + num(l.mortality), 0),
    byMonth: groupByMonth(d.logs, (l) => num(l.produced)),
  };
}

export function buildYearOverYear(data, filters = {}) {
  if (!filters.startDate || !filters.endDate) return null;
  const start = asDate(filters.startDate);
  const end = asDate(filters.endDate);
  const priorStart = new Date(start);
  priorStart.setFullYear(priorStart.getFullYear() - 1);
  const priorEnd = new Date(end);
  priorEnd.setFullYear(priorEnd.getFullYear() - 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  const current = filterAnalyticsData(data, filters);
  const prior = filterAnalyticsData(data, { ...filters, startDate: fmt(priorStart), endDate: fmt(priorEnd) });

  const sumProduction = (rows) => rows.reduce((s, r) => s + num(r.produced), 0);
  // Same accrual fix as buildExpenseAnalysis: excludes purchase-linked and
  // non-cash-echo expenses, adds the real ledger-derived deduction cost —
  // otherwise a large purchase near either period boundary would swing
  // the year-over-year comparison by its full price rather than what was
  // actually used in that period.
  const sumExpenses = (expenseRows, moveRows) =>
    directCashExpenses(expenseRows).reduce((s, e) => s + num(e.amount), 0) +
    moveRows.filter(isInventoryCostDeduction).reduce((s, m) => s + inventoryTransactionCost(m), 0);
  const pct = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : null);

  const cp = sumProduction(current.logs);
  const pp = sumProduction(prior.logs);
  const ce = sumExpenses(current.expenses, current.inventoryMoves);
  const pe = sumExpenses(prior.expenses, prior.inventoryMoves);

  return {
    current: { production: cp, expenses: ce },
    prior: { production: pp, expenses: pe },
    change: { production: pct(cp, pp), expenses: pct(ce, pe) },
  };
}

export function buildComprehensiveAnalysis(data, filters = {}) {
  const filtered = filterAnalyticsData(data, filters);
  const feed = buildFeedAnalysis(filtered);
  const expenses = buildExpenseAnalysis(filtered);
  const production = buildProductionAnalysis(filtered);
  const revenue = buildRevenueAnalysis(filtered);
  const itemCostTrend = buildItemCostTrend(filtered);
  return {
    filters,
    summary: {
      production: production.total,
      expenses: expenses.total,
      feedConsumed: feed.consumption,
      feedCost: feed.feedCost,
      wastage: feed.wastage,
      revenue: revenue.revenue,
      actualRevenue: revenue.actualRevenue,
      estimatedRevenue: revenue.estimatedRevenue,
      profit: revenue.profit,
    },
    feed,
    expenses,
    production,
    revenue,
    itemCostTrend,
    rows: { logs: filtered.logs, expenses: filtered.expenses, inventoryMoves: filtered.inventoryMoves },
  };
}

export function downloadComprehensiveAnalysis(data, filters = {}) {
  const report = buildComprehensiveAnalysis(data, filters);
  const stamp = new Date().toISOString().slice(0, 10);
  const rows = [];
  const add = (section, row) => rows.push({ section, ...row });

  add('Summary', { metric: 'Production', value: report.summary.production });
  add('Summary', { metric: 'Revenue (real + estimated)', value: report.summary.revenue });
  add('Summary', { metric: 'Revenue — from tracked sales', value: report.summary.actualRevenue });
  add('Summary', { metric: 'Revenue — estimated (untracked days)', value: report.summary.estimatedRevenue });
  add('Summary', { metric: 'Farm costs', value: report.summary.expenses });
  add('Summary', { metric: 'Profit (revenue minus farm costs)', value: report.summary.profit });
  add('Summary', { metric: 'Feed consumed', value: report.summary.feedConsumed });
  add('Summary', { metric: 'Feed cost', value: report.summary.feedCost });
  add('Summary', { metric: 'Feed wastage', value: report.summary.wastage });

  report.feed.rows.forEach((r) =>
    add('Feed', {
      item: r.name, unit: r.unit, consumed: r.consumed, wastage: r.wastage, purchased: r.purchased,
      cost: r.cost, avgUnitCost: r.avgUnitCost ?? '',
    }),
  );
  report.expenses.byType.forEach((r) => add('Expense type', { type: r.type, amount: r.amount }));
  report.production.byMonth.forEach((r) => add('Production trend', { month: r.month, produced: r.value }));
  report.itemCostTrend.forEach((item) =>
    item.weeks.forEach((w) =>
      add('Item cost by week', {
        item: item.name, unit: item.unit, week: w.week, quantity: w.quantity, cost: w.cost, avgUnitCost: w.avgUnitCost ?? '',
      }),
    ),
  );

  report.rows.logs.forEach((l) =>
    add('Production record', {
      date: l.date,
      group: data.units.find((u) => u.id === l.unitId)?.name || '',
      produced: num(l.produced),
      feedKg: num(l.feedQuantity ?? l.feedKg),
      loss: num(l.loss),
      mortality: num(l.mortality),
    }),
  );
  report.rows.expenses.forEach((e) =>
    add('Expense record', {
      date: e.date,
      group: data.units.find((u) => u.id === e.unitId)?.name || '',
      type: e.category || e.expenseType || '',
      // Same marker added to the plain expenses CSV export (reportExport.js)
      // for the same reason: a raw per-record listing that doesn't
      // distinguish a real cash payment from the app's auto-generated
      // non-cash "stock used or lost" echo risks someone reconciling this
      // file against a bank/M-Pesa statement double-counting by hand, even
      // though the Summary section above is computed correctly.
      paymentType: e.nonCash ? 'Non-cash (stock used or lost)' : 'Cash payment',
      amount: num(e.amount),
      description: e.description || '',
    }),
  );
  report.rows.inventoryMoves.forEach((m) =>
    add('Stock movement', {
      date: m.date,
      item: data.inventory.find((i) => i.id === m.itemId)?.name || '',
      group: data.units.find((u) => u.id === m.unitId)?.name || '',
      movement: m.transactionType || '',
      quantity: num(m.quantity),
      unitCost: num(m.unitCost),
      totalCost: num(m.quantity) * num(m.unitCost),
    }),
  );

  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const csv = [headers, ...rows.map((r) => headers.map((h) => cell(r[h])))].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `mazaosmart-analysis-${stamp}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  return report;
}
