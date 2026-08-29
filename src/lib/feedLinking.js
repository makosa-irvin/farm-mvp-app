// Daily-log stock usage is represented in the inventory ledger as linked
// consumption transactions — one per item the log records as used. These
// pure functions calculate the transaction state; the React action layer
// is responsible for persisting it and showing validation feedback.
//
// A log can record using several different items in one day (feed,
// medicine, whatever's tracked) via `log.consumedItems`, an array of
// { itemId, quantity }. Older logs, written before this existed, only
// ever recorded a single item via `feedItemId`/`feedQuantity` (or the
// even older `feedKg`) — normalizedConsumedItems() below reads either
// shape transparently, so nothing about an existing log needs to be
// migrated for it to keep working exactly as it always has.

import { getBalance, getWeightedAverageCost } from './inventoryLedger.js';

export function feedTransactionId(logId, itemId) {
  return `logfeed_${logId}_${itemId}`;
}

// Normalizes a log's stock use to a single shape regardless of which
// version of the data model wrote it. Repeated itemIds (e.g. a farmer
// accidentally lists the same item twice) are merged into one entry —
// otherwise they'd collide on the same transaction id from
// feedTransactionId() above and silently overwrite each other.
export function normalizedConsumedItems(log) {
  const merged = new Map();

  const add = (itemId, quantity) => {
    if (!itemId || !(quantity > 0)) return;
    merged.set(itemId, (merged.get(itemId) || 0) + quantity);
  };

  if (Array.isArray(log.consumedItems)) {
    log.consumedItems.forEach((entry) => add(entry?.itemId, Number(entry?.quantity)));
  } else {
    // Legacy shape: a single feed item, no array at all.
    add(log.feedItemId, Number(log.feedQuantity ?? log.feedKg));
  }

  return [...merged.entries()].map(([itemId, quantity]) => ({ itemId, quantity }));
}

// Builds the ledger entries a daily log represents — one per distinct
// item it records as used, or an empty array when it records none.
export function buildFeedTransactions(log, units, previousLog = null) {
  const items = normalizedConsumedItems(log);
  if (items.length === 0) return [];
  const unitName = units.find((u) => u.id === log.unitId)?.name || 'farm group';
  return items.map(({ itemId, quantity }) => ({
    id: feedTransactionId(log.id, itemId),
    itemId,
    transactionType: 'consumption',
    direction: 'out',
    quantity,
    date: log.date,
    note: `Used by ${unitName}`,
    source: 'daily-log',
    sourceId: log.id,
    unitId: log.unitId,
    createdAt: previousLog?.createdAt || Date.now(),
  }));
}

// Checks every item a log wants to record as used against its own
// current balance, independent of the others — one item being short
// doesn't affect checking any other. Returns details for the first
// shortfall found, matching the single-item version's shape so existing
// callers (the "not enough X" toast) don't need to change.
export function checkFeedAvailability(log, units, inventory, transactions) {
  const items = normalizedConsumedItems(log);
  if (items.length === 0) return { ok: true };

  const currentTransactionIds = new Set(items.map(({ itemId }) => feedTransactionId(log.id, itemId)));
  const withoutCurrent = transactions.filter((t) => !currentTransactionIds.has(t.id));

  for (const { itemId, quantity } of items) {
    const available = getBalance(inventory, withoutCurrent, itemId);
    if (quantity > available + 1e-9) {
      const item = inventory.find((i) => i.id === itemId);
      return { ok: false, itemName: item?.name || 'stock', itemUnit: item?.unit || '', available };
    }
  }
  return { ok: true };
}

// Rebuilds every linked transaction when a log is added or edited.
// Removing all of the log's previous linked entries first (by source +
// sourceId, which matches however many there were) prevents an edit
// from double-counting consumption, the same guarantee the single-item
// version had.
//
// All-or-nothing, matching the original behavior: if any one item in
// the log would over-consume its own stock, the whole set of this log's
// stock-use transactions is rejected together (the caller's existing
// transaction list is returned unchanged) rather than applying some
// items and rejecting others, which would leave a log entry that says
// one thing while the ledger reflects something partially different.
export function syncedTransactionsForLog(log, units, inventory, transactions, previousLog = null) {
  const withoutCurrent = transactions.filter((t) => !(t.source === 'daily-log' && t.sourceId === log.id));
  const movements = buildFeedTransactions(log, units, previousLog);
  if (movements.length === 0) return withoutCurrent;

  const built = [];
  let working = withoutCurrent;
  for (const movement of movements) {
    const item = inventory.find((i) => i.id === movement.itemId);
    if (!item) continue; // the item no longer exists — skip rather than fail the whole log
    const available = getBalance(inventory, working, movement.itemId);
    if (movement.quantity > available) return transactions; // reject the whole set together
    const cost = getWeightedAverageCost(inventory, working, movement.itemId);
    const resolved = { ...movement, unit: item.unit, unitCost: cost, type: 'out' };
    built.push(resolved);
    working = [...working, resolved];
  }
  return [...withoutCurrent, ...built];
}
