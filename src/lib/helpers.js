import { UNIT_TYPES } from '../constants.js';

export function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

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

export function currentCountFor(unit, logs) {
  const mortality = logs
    .filter((l) => l.unitId === unit.id)
    .reduce((s, l) => s + (l.mortality || 0), 0);
  return Math.max(0, (unit.initialCount || 0) - mortality);
}

// The core Phase-1 unit-economics calculation: direct costs only (no
// indirect/allocated costs yet — see AllocationRule in the design plan's
// Phase 2 Cost Allocation Engine).
export function unitMetrics(unit, logs, expenses, period) {
  const unitLogs = logs.filter((l) => l.unitId === unit.id && inPeriod(l.date, period));
  const unitExpenses = expenses.filter((e) => e.unitId === unit.id && inPeriod(e.date, period));

  const produced = unitLogs.reduce((s, l) => s + (l.produced || 0), 0);
  const loss = unitLogs.reduce((s, l) => s + (l.loss || 0), 0);
  const mortality = unitLogs.reduce((s, l) => s + (l.mortality || 0), 0);
  const feedKg = unitLogs.reduce((s, l) => s + (l.feedKg || 0), 0);
  const directCost = unitExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const costPerUnit = produced > 0 ? directCost / produced : null;
  const t = typeOf(unit);
  const costPerGroup = costPerUnit !== null ? costPerUnit * t.groupSize : null;
  const fcr = produced > 0 && feedKg > 0 ? feedKg / produced : null;

  const days = periodDayCount(period, unit.startDate);
  const liveCount = currentCountFor(unit, logs);
  const animalDays = liveCount * days;
  const productionRate = animalDays > 0 && t.hasGrades ? (produced / animalDays) * 100 : null;
  const mortalityRate = liveCount + mortality > 0 ? (mortality / (liveCount + mortality)) * 100 : null;

  return {
    produced, loss, mortality, feedKg, directCost,
    costPerUnit, costPerGroup, fcr, productionRate, mortalityRate,
    liveCount, logCount: unitLogs.length,
  };
}
