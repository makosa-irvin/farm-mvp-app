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
  return UNIT_TYPES.find((t) => t.value === unit.type) || UNIT_TYPES[3];
}

export function fmtMoney(n) {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  return '$' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtNum(n, digits = 0) {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// Weighted-average cost per unit of an inventory item, blending its
// starting (opening-stock) cost with every incoming ("in") transaction
// since. Used for display (Dashboard's "Inventory value" card) — the
// authoritative version used when actually costing a new outgoing
// transaction is inventoryLedger.js's getWeightedAverageCost, which this
// mirrors but takes the item object directly instead of an id + array.
export function inventoryUnitCost(item, moves) {
  if (!item) return 0;
  let qty = Number(item.openingStock) || 0;
  let value = qty * (Number(item.unitCost) || 0);
  for (const move of moves.filter(m => m.itemId === item.id && (m.direction || m.type) === 'in')) {
    const q = Number(move.quantity) || 0;
    qty += q;
    value += q * (Number(move.unitCost ?? item.unitCost) || 0);
  }
  return qty > 0 ? value / qty : Number(item.unitCost) || 0;
}

// Whether a plain YYYY-MM-DD date string falls within the given period,
// relative to *now* (not relative to some other reference date) — "today"
// means today, "week" means the last 7 days including today, etc.
export function inPeriod(dateStr, period) {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  if (period === 'today') return dateStr === todayISO();
  if (period === 'week') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);
    return d >= cutoff;
  }
  if (period === 'month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
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
    const start = startDate ? new Date(startDate + 'T00:00:00') : now;
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
    .filter((l) => l.unitId === unit.id)
    .reduce((s, l) => s + (l.mortality || 0), 0);
  return Math.max(0, (unit.initialCount || 0) - mortality);
}

// The core unit-economics calculation behind the Dashboard and Analytics
// views: production, feed use, cost, and (if a selling price is set)
// revenue and profit for one unit over one period.
//
// The cost side has one deliberate subtlety: an expense linked to an
// inventory item (e.g. "bought 150kg of feed for $105") is excluded from
// directExpenseCost entirely. Its economic effect only shows up later, and
// only for whatever was actually *consumed*, via consumedInventoryCost —
// which reads the ledger's consumption transactions (weighted-average
// costed, see inventoryLedger.js) rather than the purchase amount. This
// means buying a large batch of feed doesn't spike a unit's cost-per-egg
// the day it's purchased; the cost lands gradually as the feed is used,
// which is closer to how the money is actually "spent" (the rest is still
// on-hand inventory, not yet consumed). See src/lib/expenseLinking.js and
// src/lib/feedLinking.js for how these transactions get created.
export function unitMetrics(unit, logs, expenses, period, inventoryMoves = []) {
  const unitLogs = logs.filter((l) => l.unitId === unit.id && inPeriod(l.date, period));
  const unitExpenses = expenses.filter((e) => e.unitId === unit.id && inPeriod(e.date, period));

  const produced = unitLogs.reduce((s, l) => s + (l.produced || 0), 0);
  const loss = unitLogs.reduce((s, l) => s + (l.loss || 0), 0);
  const mortality = unitLogs.reduce((s, l) => s + (l.mortality || 0), 0);
  const feedKg = unitLogs.reduce((s, l) => s + (l.feedQuantity ?? l.feedKg ?? 0), 0);
  const directExpenseCost = unitExpenses.reduce((s, e) => s + (e.inventoryItemId ? 0 : (e.amount || 0)), 0);
  const consumedInventoryCost = inventoryMoves
    .filter(m => m.transactionType === 'consumption' && m.unitId === unit.id && inPeriod(m.date, period))
    .reduce((s, m) => s + (Number(m.quantity) || 0) * (Number(m.unitCost) || 0), 0);
  const directCost = directExpenseCost + consumedInventoryCost;

  const costPerUnit = produced > 0 ? directCost / produced : null;
  const t = typeOf(unit);
  const producePrice = Number(unit.producePrice) || 0;
  const revenue = produced > 0 && producePrice > 0 ? (produced / t.groupSize) * producePrice : 0;
  const profit = revenue - directCost;
  const costPerGroup = costPerUnit !== null ? costPerUnit * t.groupSize : null;
  const fcr = produced > 0 && feedKg > 0 ? feedKg / produced : null;

  const days = periodDayCount(period, unit.startDate);
  const liveCount = currentCountFor(unit, logs);
  const animalDays = liveCount * days;
  const productionRate = animalDays > 0 && t.hasGrades ? (produced / animalDays) * 100 : null;
  const mortalityRate = liveCount + mortality > 0 ? (mortality / (liveCount + mortality)) * 100 : null;

  return {
    produced, loss, mortality, feedKg, directCost,
    costPerUnit, costPerGroup, fcr, productionRate, mortalityRate, revenue, profit,
    liveCount, logCount: unitLogs.length,
  };
}
