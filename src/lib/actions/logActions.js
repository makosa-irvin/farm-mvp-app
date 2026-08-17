import { typeOf, fmtNum } from '../helpers.js';
import { checkFeedAvailability, syncedTransactionsForLog } from '../feedLinking.js';

export function createLogActions({ units, logs, inventory, transactions, setLogs, setInventoryTransactions, showToast }) {
  function rejectIfNotEnoughFeed(entry) {
    const check = checkFeedAvailability(entry, units, inventory, transactions);
    if (!check.ok) {
      showToast(`Not enough ${check.itemName}. Available: ${fmtNum(check.available)} ${check.itemUnit}.`);
      return true;
    }
    return false;
  }

  const addLog = (entry, unit) => {
    if (rejectIfNotEnoughFeed(entry)) return false;
    const t = typeOf(unit);
    const recentBest = logs
      .filter((l) => l.unitId === unit.id && l.date !== entry.date)
      .reduce((max, l) => Math.max(max, l.produced || 0), 0);
    const isBest = entry.produced > 0 && entry.produced > recentBest;
    setLogs((prev) => [...prev, entry]);
    setInventoryTransactions(syncedTransactionsForLog(entry, units, inventory, transactions));
    showToast(`${fmtNum(entry.produced)} ${t.unitLabel} logged for ${unit.name}${isBest ? ' — best entry yet.' : '.'}`);
    return true;
  };

  const updateLog = (entry) => {
    if (rejectIfNotEnoughFeed(entry)) return false;
    const previous = logs.find((l) => l.id === entry.id);
    setLogs((prev) => prev.map((x) => (x.id === entry.id ? entry : x)));
    setInventoryTransactions(syncedTransactionsForLog(entry, units, inventory, transactions, previous));
    showToast('Daily log updated.');
    return true;
  };

  const removeLog = (id) => {
    if (!window.confirm('Delete this daily log entry? Its linked feed consumption transaction will also be removed.')) return;
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setInventoryTransactions((prev) => prev.filter((t) => !(t.source === 'daily-log' && t.sourceId === id)));
    showToast('Daily log deleted.');
  };

  return { addLog, updateLog, removeLog };
}
