// Daily log CRUD, plus the automatic sync to a feed-consumption transaction
// (see src/lib/feedLinking.js) when a log records feed use against a
// tracked inventory item.
//
// A single log record can represent production, stock use, disposition
// (sold/used/spoiled), or any mix — DailyLogView saves each of its three
// sections independently now, so most records in practice only carry one
// kind of data, but nothing here assumes that; the aggregation elsewhere
// (unitMetrics, analytics) already sums whatever fields are present
// across however many records exist for a unit and period, regardless of
// how many separate saves produced them.
import { typeOf, fmtNum } from '../helpers.js';
import { checkFeedAvailability, syncedTransactionsForLog, normalizedConsumedItems } from '../feedLinking.js';

export function createLogActions({ units, logs, inventory, transactions, setLogs, setInventoryTransactions, showToast, confirm }) {
  function rejectIfNotEnoughFeed(entry) {
    const check = checkFeedAvailability(entry, units, inventory, transactions);
    if (!check.ok) {
      showToast(`Not enough ${check.itemName}. Available: ${fmtNum(check.available)} ${check.itemUnit}.`);
      return true;
    }
    return false;
  }

  // `kind` is purely cosmetic — which toast to show — and never changes
  // what's actually saved; the entry object itself already carries only
  // whatever fields the caller populated.
  function describeSaved(entry, unit, kind) {
    const t = typeOf(unit);
    if (kind === 'stock') return `Stock use recorded for ${unit.name}.`;
    if (kind === 'disposition') {
      const hasSold = entry.sold !== undefined && entry.sold !== null && entry.sold !== '';
      return hasSold ? `Sale recorded for ${unit.name}.` : `Recorded what happened to ${unit.name}'s produce.`;
    }
    const recentBest = logs
      .filter((l) => l.unitId === unit.id && l.date !== entry.date)
      .reduce((max, l) => Math.max(max, l.produced || 0), 0);
    const isBest = entry.produced > 0 && entry.produced > recentBest;
    return `${fmtNum(entry.produced)} ${t.unitLabel} logged for ${unit.name}${isBest ? ' — best entry yet.' : '.'}`;
  }

  const addLog = (entry, unit, kind = 'production') => {
    if (rejectIfNotEnoughFeed(entry)) return false;
    setLogs((prev) => [...prev, entry]);
    setInventoryTransactions(syncedTransactionsForLog(entry, units, inventory, transactions));
    showToast(describeSaved(entry, unit, kind));
    return true;
  };

  const updateLog = (entry, unit, kind = 'production') => {
    if (rejectIfNotEnoughFeed(entry)) return false;
    const previous = logs.find((l) => l.id === entry.id);
    setLogs((prev) => prev.map((x) => (x.id === entry.id ? entry : x)));
    setInventoryTransactions(syncedTransactionsForLog(entry, units, inventory, transactions, previous));
    showToast(unit ? describeSaved(entry, unit, kind) : 'Daily log updated.');
    return true;
  };

  const removeLog = async (id) => {
    const entry = logs.find((l) => l.id === id);
    const usesStock = entry ? normalizedConsumedItems(entry).length > 0 : false;
    const message = usesStock
      ? 'Remove this entry? Any feed or stock it used will go back into your stock total.'
      : 'Remove this entry?';
    if (!(await confirm(message))) return;
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setInventoryTransactions((prev) => prev.filter((t) => !(t.source === 'daily-log' && t.sourceId === id)));
    showToast('Entry removed.');
  };

  return { addLog, updateLog, removeLog };
}
