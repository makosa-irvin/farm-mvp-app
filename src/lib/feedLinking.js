// Cross-domain linking between daily logs and the inventory ledger: logging
// feed consumption creates a matching `consumption` transaction, with a
// deterministic id tied to the log entry so it can always be found again
// on edit or delete. Pure functions — the hook calls setState with the
// results.

import { getBalance, getWeightedAverageCost } from './inventoryLedger.js';

export function feedTransactionId(logId) {
  return `logfeed_${logId}`;
}

// The transaction a given log entry SHOULD have, or null if it doesn't log
// any feed consumption.
export function buildFeedTransaction(log, units, previousLog = null) {
  const qty = Number(log.feedQuantity ?? log.feedKg);
  if (!log.feedItemId || !qty) return null;
  return {
    id: feedTransactionId(log.id),
    itemId: log.feedItemId,
    transactionType: 'consumption',
    direction: 'out',
    quantity: qty,
    date: log.date,
    note: `Feed consumed by ${units.find((u) => u.id === log.unitId)?.name || 'production unit'}`,
    source: 'daily-log',
    sourceId: log.id,
    unitId: log.unitId,
    createdAt: previousLog?.createdAt || Date.now(),
  };
}

// Whether saving this log would try to consume more feed than is
// available. Doesn't touch state or show anything — just answers the
// question, in the same shape checkOutgoing() in inventoryLedger.js uses.
export function checkFeedAvailability(log, units, inventory, transactions) {
  const qty = Number(log.feedQuantity ?? log.feedKg);
  if (!log.feedItemId || !qty) return { ok: true };
  const tx = buildFeedTransaction(log, units);
  const withoutCurrent = transactions.filter((t) => t.id !== tx.id);
  const available = getBalance(inventory, withoutCurrent, tx.itemId);
  if (qty > available + 1e-9) {
    const item = inventory.find((i) => i.id === tx.itemId);
    return { ok: false, itemName: item?.name || 'stock', itemUnit: item?.unit || '', available };
  }
  return { ok: true };
}

// Computes the transactions array that should result from saving this log
// entry. Doesn't call setState itself — the caller does that with the
// result, which keeps this function pure and testable with plain arrays.
export function syncedTransactionsForLog(log, units, inventory, transactions, previousLog = null) {
  const withoutCurrent = transactions.filter((t) => !(t.source === 'daily-log' && t.sourceId === log.id));
  const movement = buildFeedTransaction(log, units, previousLog);
  if (!movement) return withoutCurrent;
  const item = inventory.find((i) => i.id === movement.itemId);
  if (!item) return withoutCurrent;
  const available = getBalance(inventory, withoutCurrent, movement.itemId);
  if (movement.quantity > available) return transactions; // keep old transaction if this would over-consume
  const cost = getWeightedAverageCost(inventory, withoutCurrent, movement.itemId);
  return [...withoutCurrent, { ...movement, unit: item.unit, unitCost: cost, type: 'out' }];
}
