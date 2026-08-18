import { UNIT_TYPES } from '../constants.js';

// Short random id for client-generated records (units, logs, expenses,
// inventory items — anything created without a server to assign a real id).
export function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Today's date as a plain YYYY-MM-DD string — the format every date field
// in the app is stored and compared as (never a full ISO datetime).
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Looks up a unit's UNIT_TYPES entry (icon, labels, whether it tracks egg
// grades, etc.). Falls back to the last entry ("other") for an unknown type
// rather than returning undefined, so callers can destructure it safely.
export function typeOf(unit) {
  return UNIT_TYPES.find((type) => type.value === unit.type) || UNIT_TYPES[3];
}

// Formats a Kenyan Shilling amount. Whole totals (expenses, revenue) round
// to the nearest shilling by default, matching how KSh amounts are
// normally written day-to-day — pass decimals=2 (or more) for per-unit
// costs like "cost per egg", where a fraction of a shilling is the whole
// point (KSh 4 vs KSh 5 per egg is a real difference at that scale).
export function fmtMoney(value, decimals = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  return 'KSh ' + value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtNum(value, digits = 0) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function inventoryUnitCost(item, moves) {
  if (!item) return 0;

  let quantity = Number(item.openingStock) || 0;
  let value = quantity * (Number(item.unitCost) || 0);

  for (const move of moves.filter(
    (entry) =>
      entry.itemId === item.id &&
      (entry.direction || entry.type) === 'in',
  )) {
    const moveQuantity = Number(move.quantity) || 0;
    quantity += moveQuantity;
    value +=
      moveQuantity * (Number(move.unitCost ?? item.unitCost) || 0);
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

  if (period === 'month') {
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth()
    );
  }

  return true;
}

// Number of calendar days a period covers, used as the denominator for
// rate metrics (production rate, mortality rate) in unitMetrics below.
// "all" measures from the unit's start date to today.
export function periodDayCount(period, startDate) {
  const now = new Date();

  if (period === 'today') return 1;
  if (period === 'week') return 7;
  if (period === 'month') return now.getDate();

  if (period === 'all') {
    const start = startDate
      ? new Date(`${startDate}T00:00:00`)
      : now;
    return Math.max(1, Math.round((now - start) / 86400000) + 1);
  }

  return 1;
}

// A unit's current live headcount: how many started, minus everything
// logged as mortality since. There's no separate "flock movement" record
// for animals added later, so this is the full picture as the app
// currently models it.
export function currentCountFor(unit, logs) {
  const mortality = logs
    .filter((log) => log.unitId === unit.id)
    .reduce((sum, log) => sum + (log.mortality || 0), 0);

  return Math.max(0, (unit.initialCount || 0) - mortality);
}

// Phase-1 unit economics currently includes direct costs only. Indirect and
// allocated costs belong to the future cost-allocation layer.
export function unitMetrics(
  unit,
  logs,
  expenses,
  period,
  inventoryMoves = [],
) {
  const unitLogs = logs.filter(
    (log) => log.unitId === unit.id && inPeriod(log.date, period),
  );
  const unitExpenses = expenses.filter(
    (expense) =>
      expense.unitId === unit.id && inPeriod(expense.date, period),
  );

  const produced = unitLogs.reduce(
    (sum, log) => sum + (log.produced || 0),
    0,
  );
  const loss = unitLogs.reduce((sum, log) => sum + (log.loss || 0), 0);
  const mortality = unitLogs.reduce(
    (sum, log) => sum + (log.mortality || 0),
    0,
  );
  const feedKg = unitLogs.reduce(
    (sum, log) => sum + (log.feedQuantity ?? log.feedKg ?? 0),
    0,
  );
  const directExpenseCost = unitExpenses.reduce(
    (sum, expense) =>
      sum + (expense.inventoryItemId ? 0 : expense.amount || 0),
    0,
  );
  const consumedInventoryCost = inventoryMoves
    .filter(
      (move) =>
        move.transactionType === 'consumption' &&
        move.unitId === unit.id &&
        inPeriod(move.date, period),
    )
    .reduce(
      (sum, move) =>
        sum + (Number(move.quantity) || 0) * (Number(move.unitCost) || 0),
      0,
    );
  const directCost = directExpenseCost + consumedInventoryCost;

  const costPerUnit = produced > 0 ? directCost / produced : null;
  const unitType = typeOf(unit);
  const producePrice = Number(unit.producePrice) || 0;
  const revenue =
    produced > 0 && producePrice > 0
      ? (produced / unitType.groupSize) * producePrice
      : 0;
  const profit = revenue - directCost;
  const costPerGroup =
    costPerUnit !== null ? costPerUnit * unitType.groupSize : null;
  const fcr = produced > 0 && feedKg > 0 ? feedKg / produced : null;

  const days = periodDayCount(period, unit.startDate);
  const liveCount = currentCountFor(unit, logs);
  const animalDays = liveCount * days;
  const productionRate =
    animalDays > 0 && unitType.hasGrades
      ? (produced / animalDays) * 100
      : null;
  const mortalityRate =
    liveCount + mortality > 0
      ? (mortality / (liveCount + mortality)) * 100
      : null;

  return {
    produced,
    loss,
    mortality,
    feedKg,
    directCost,
    costPerUnit,
    costPerGroup,
    fcr,
    productionRate,
    mortalityRate,
    revenue,
    profit,
    liveCount,
    logCount: unitLogs.length,
  };
}
