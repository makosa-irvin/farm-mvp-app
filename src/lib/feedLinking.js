import { getBalance, getWeightedAverageCost } from './inventoryLedger.js';

export function logInputTransactionId(logId, index = 0) { return `loginput_${logId}_${index}`; }
export function feedTransactionId(logId) { return logInputTransactionId(logId, 0); }

export function inputsForLog(log) {
  if (Array.isArray(log.inputs)) return log.inputs.filter((x) => x?.itemId && Number(x.quantity) > 0);
  const qty = Number(log.feedQuantity ?? log.feedKg);
  return log.feedItemId && qty > 0 ? [{ itemId: log.feedItemId, quantity: qty, kind: 'feed' }] : [];
}

export function buildInputTransactions(log, units, previousLog = null) {
  const groupName = units.find((u) => u.id === log.unitId)?.name || 'farm group';
  return inputsForLog(log).map((input, index) => ({
    id: logInputTransactionId(log.id, index), itemId: input.itemId, transactionType: 'consumption', direction: 'out',
    quantity: Number(input.quantity), date: log.date, note: `${input.kind || 'Stock'} used by ${groupName}`,
    source: 'daily-log', sourceId: log.id, unitId: log.unitId, createdAt: previousLog?.createdAt || Date.now(),
  }));
}
export function buildFeedTransaction(log, units, previousLog = null) { return buildInputTransactions(log, units, previousLog)[0] || null; }

export function checkFeedAvailability(log, units, inventory, transactions) {
  const movements = buildInputTransactions(log, units);
  const withoutCurrent = transactions.filter((t) => !(t.source === 'daily-log' && t.sourceId === log.id));
  const requested = new Map();
  for (const move of movements) requested.set(move.itemId, (requested.get(move.itemId) || 0) + move.quantity);
  for (const [itemId, quantity] of requested) {
    const available = getBalance(inventory, withoutCurrent, itemId);
    if (quantity > available + 1e-9) { const item = inventory.find((i) => i.id === itemId); return { ok: false, itemName: item?.name || 'stock', itemUnit: item?.unit || '', available }; }
  }
  return { ok: true };
}

export function syncedTransactionsForLog(log, units, inventory, transactions, previousLog = null) {
  const withoutCurrent = transactions.filter((t) => !(t.source === 'daily-log' && t.sourceId === log.id));
  const movements = buildInputTransactions(log, units, previousLog);
  const check = checkFeedAvailability(log, units, inventory, transactions);
  if (!check.ok) return transactions;
  const additions = movements.flatMap((movement) => {
    const item = inventory.find((i) => i.id === movement.itemId); if (!item) return [];
    const cost = getWeightedAverageCost(inventory, withoutCurrent, movement.itemId);
    return [{ ...movement, unit: item.unit, unitCost: cost, type: 'out' }];
  });
  return [...withoutCurrent, ...additions];
}
