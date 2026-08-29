import { UNIT_TYPES } from '../constants.js';
import { isInventoryCostDeduction, inventoryTransactionCost } from './inventoryLedger.js';

export function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function typeOf(unit) {
  const base = UNIT_TYPES.find((type) => type.value === unit.type) || UNIT_TYPES[3];
  if (!base.configurable) return base;
  const groupSize = Number(unit.customGroupSize);
  return {
    ...base,
    unitLabel: unit.customUnitLabel?.trim() || base.unitLabel,
    groupLabel: unit.customGroupLabel?.trim() || base.groupLabel,
    groupSize: groupSize > 0 ? groupSize : base.groupSize,
  };
}

export function fmtMoney(value, decimals = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return (
    'KSh ' +
    value.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  );
}

export function fmtNum(value, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function inventoryUnitCost(item, moves) {
  if (!item) return 0;
  let quantity = Number(item.openingStock) || 0;
  let value = quantity * (Number(item.unitCost) || 0);
  for (const move of moves.filter((entry) => entry.itemId === item.id && (entry.direction || entry.type) === 'in')) {
    const moveQuantity = Number(move.quantity) || 0;
    quantity += moveQuantity;
    value += moveQuantity * (Number(move.unitCost ?? item.unitCost) || 0);
  }
  return quantity > 0 ? value / quantity : Number(item.unitCost) || 0;
}

export function inPeriod(dateString, period) {
  const date = new Date(`${dateString}T00:00:00`);
  const now = new Date();
  if (period === 'today') return dateString === todayISO();
  if (period === 'week') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);
    return date >= cutoff;
  }
  if (period === 'month') return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  return true;
}

export function periodDayCount(period, startDate) {
  const now = new Date();
  if (period === 'today') return 1;
  if (period === 'week') return 7;
  if (period === 'month') return now.getDate();
  if (period === 'all') {
    const start = startDate ? new Date(`${startDate}T00:00:00`) : now;
    return Math.max(1, Math.round((now - start) / 86400000) + 1);
  }
  return 1;
}

export function currentCountFor(unit, logs) {
  const mortality = logs.filter((log) => log.unitId === unit.id).reduce((sum, log) => sum + (log.mortality || 0), 0);
  return Math.max(0, (unit.initialCount || 0) - mortality);
}

// The output-side equivalent of the input-inventory ledger balance: how
// much of what a unit has produced is still unsold/unused, as of a given
// date (defaults to "everything on record"). A farmer might get 180 eggs
// this week and only sell 30 of them, selling the rest gradually over
// the month — this is what lets them see "150 eggs still in hand" and
// record a sale against that whenever they actually make one, rather
// than needing to sell everything the same day it was produced. Clamped
// to zero rather than allowed to go negative, matching the same
// defensive pattern currentCountFor() above uses for mortality
// potentially exceeding a recorded headcount — a data-entry mistake
// shouldn't be able to show as a nonsensical negative stock of produce.
export function getProduceBalance(unit, logs, asOfDate = null) {
  const unitLogs = logs.filter((log) => log.unitId === unit.id && (!asOfDate || log.date <= asOfDate));
  const produced = unitLogs.reduce((sum, log) => sum + (Number(log.produced) || 0), 0);
  const disposed = unitLogs.reduce(
    (sum, log) => sum + (Number(log.sold) || 0) + (Number(log.usedInternally) || 0) + (Number(log.loss) || 0),
    0,
  );
  return Math.max(0, produced - disposed);
}

// Inventory purchases are cash expenses when bought, but inventory itself is
// not an operating cost until it is consumed or lost. Therefore production
// cost uses the ledger's weighted-average cost for every inventory deduction
// (use, loss/spoilage, and downward write-off), while the purchase expense is
// excluded from direct cost to avoid double counting.
export function unitMetrics(unit, logs, expenses, period, inventoryMoves = []) {
  const unitLogs = logs.filter((log) => log.unitId === unit.id && inPeriod(log.date, period));
  const unitExpenses = expenses.filter((expense) => expense.unitId === unit.id && inPeriod(expense.date, period));
  const produced = unitLogs.reduce((sum, log) => sum + (log.produced || 0), 0);
  const loss = unitLogs.reduce((sum, log) => sum + (log.loss || 0), 0);
  const sold = unitLogs.reduce((sum, log) => sum + (Number(log.sold) || 0), 0);
  const usedInternally = unitLogs.reduce((sum, log) => sum + (Number(log.usedInternally) || 0), 0);
  const mortality = unitLogs.reduce((sum, log) => sum + (log.mortality || 0), 0);
  const feedKg = unitLogs.reduce((sum, log) => sum + (log.feedQuantity ?? log.feedKg ?? 0), 0);
  const directExpenseCost = unitExpenses.reduce((sum, expense) => sum + (expense.inventoryItemId ? 0 : expense.amount || 0), 0);
  const inventoryCost = inventoryMoves
    .filter((move) => move.unitId === unit.id && inPeriod(move.date, period) && isInventoryCostDeduction(move))
    .reduce((sum, move) => sum + inventoryTransactionCost(move), 0);
  const directCost = directExpenseCost + inventoryCost;

  const costPerUnit = produced > 0 ? directCost / produced : null;
  const unitType = typeOf(unit);
  const producePrice = Number(unit.producePrice) || 0;
  // Revenue: real where a log records how much was actually sold
  // (log.sold), falling back to the produced-based estimate for any
  // entry that doesn't track disposition — most commonly, entries
  // logged before this existed, or a farmer who doesn't always bother
  // recording what was actually sold. Computed per entry, not as one
  // aggregate estimate over the period total, so a farm that tracks
  // some days precisely and estimates others gets a blended figure
  // that's as accurate as the data actually supports, not artificially
  // exact or artificially approximate.
  let actualRevenue = 0;
  let estimatedRevenue = 0;
  unitLogs.forEach((log) => {
    const hasSold = log.sold !== undefined && log.sold !== null && log.sold !== '';
    const price = hasSold && Number(log.salePrice) > 0 ? Number(log.salePrice) : producePrice;
    if (price <= 0) return;
    if (hasSold) {
      const qty = Number(log.sold) || 0;
      if (qty > 0) actualRevenue += (qty / unitType.groupSize) * price;
    } else {
      const qty = Number(log.produced) || 0;
      if (qty > 0) estimatedRevenue += (qty / unitType.groupSize) * price;
    }
  });
  const revenue = actualRevenue + estimatedRevenue;
  const profit = revenue - directCost;
  const costPerGroup = costPerUnit !== null ? costPerUnit * unitType.groupSize : null;
  const fcr = produced > 0 && feedKg > 0 ? feedKg / produced : null;
  const days = periodDayCount(period, unit.startDate);
  const liveCount = currentCountFor(unit, logs);
  const animalDays = liveCount * days;
  const productionRate = animalDays > 0 && unitType.hasGrades ? (produced / animalDays) * 100 : null;
  const mortalityRate = liveCount + mortality > 0 ? (mortality / (liveCount + mortality)) * 100 : null;

  return {
    produced,
    loss,
    sold,
    usedInternally,
    mortality,
    feedKg,
    directCost,
    costPerUnit,
    costPerGroup,
    fcr,
    productionRate,
    mortalityRate,
    revenue,
    // Whether `revenue` above is fully grounded in real sold-quantity
    // data, partly estimated, or entirely estimated (no log in the
    // period tracked disposition at all) — lets a caller show something
    // like "includes some estimated days" rather than presenting a
    // blended figure as if it were entirely one or the other.
    actualRevenue,
    estimatedRevenue,
    profit,
    liveCount,
    logCount: unitLogs.length,
  };
}

const EXPENSE_CATEGORY_LABELS = {
  feed: 'Feed',
  medicine: 'Medicine',
  labor: 'Labor',
  utilities: 'Utilities',
  supplies: 'Supplies',
  capital: 'Capital',
};

export function unitCostBreakdown(unit, logs, expenses, period, inventoryMoves = [], inventory = []) {
  const unitExpenses = expenses.filter((expense) => expense.unitId === unit.id && inPeriod(expense.date, period));
  const totals = new Map();

  for (const expense of unitExpenses) {
    if (expense.inventoryItemId) continue;
    const label = EXPENSE_CATEGORY_LABELS[expense.category] || 'Other';
    totals.set(label, (totals.get(label) || 0) + (expense.amount || 0));
  }

  const deductions = inventoryMoves.filter(
    (move) => move.unitId === unit.id && inPeriod(move.date, period) && isInventoryCostDeduction(move),
  );
  for (const move of deductions) {
    const item = inventory.find((i) => i.id === move.itemId);
    const label = item?.category || 'Other';
    totals.set(label, (totals.get(label) || 0) + inventoryTransactionCost(move));
  }

  return [...totals.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

export function dailyProductionTrend(unit, logs, days = 14) {
  const result = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const value = logs.filter((log) => log.unitId === unit.id && log.date === dateStr).reduce((sum, log) => sum + (log.produced || 0), 0);
    result.push({ date: dateStr, value });
  }
  return result;
}
