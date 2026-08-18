// Daily-log feed usage is represented in the inventory ledger as a linked
// consumption transaction. These pure functions calculate the transaction
// state; the React action layer is responsible for persisting it and showing
// validation feedback.

import { getBalance, getWeightedAverageCost } from './inventoryLedger.js';

export function feedTransactionId(logId) {
  return `logfeed_${logId}`;
}

// Build the ledger entry represented by a daily log, or null when the log
// does not record feed consumption.
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
    note: `Feed consumed by ${units.find((u) => u.id === log.unitId)?.name || 'farm group'}`,
    source: 'daily-log',
    sourceId: log.id,
    unitId: log.unitId,
    createdAt: previousLog?.createdAt || Date.now(),
  };
}

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

// Rebuild the linked transaction when a log is added or edited. Removing the
// old linked entry first prevents an edit from double-counting consumption.
export function syncedTransactionsForLog(log, units, inventory, transactions, previousLog = null) {
  const withoutCurrent = transactions.filter((t) => !(t.source === 'daily-log' && t.sourceId === log.id));
  const movement = buildFeedTransaction(log, units, previousLog);
  if (!movement) return withoutCurrent;
  const item = inventory.find((i) => i.id === movement.itemId);
  if (!item) return withoutCurrent;
  const available = getBalance(inventory, withoutCurrent, movement.itemId);
  if (movement.quantity > available) return transactions;
  const cost = getWeightedAverageCost(inventory, withoutCurrent, movement.itemId);
  return [...withoutCurrent, { ...movement, unit: item.unit, unitCost: cost, type: 'out' }];
}
