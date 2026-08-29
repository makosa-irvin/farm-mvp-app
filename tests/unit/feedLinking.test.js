import { describe, it, expect } from 'vitest';
import { buildFeedTransactions, checkFeedAvailability, syncedTransactionsForLog, normalizedConsumedItems } from '../../src/lib/feedLinking.js';

const units = [{ id: 'u1', name: 'Layer House A' }];

describe('normalizedConsumedItems — backward compatibility', () => {
  it('reads the new consumedItems array', () => {
    const log = { consumedItems: [{ itemId: 'i1', quantity: 45 }, { itemId: 'i2', quantity: 10 }] };
    expect(normalizedConsumedItems(log)).toEqual([
      { itemId: 'i1', quantity: 45 },
      { itemId: 'i2', quantity: 10 },
    ]);
  });

  it('falls back to the legacy single feedItemId/feedQuantity when there is no consumedItems array at all', () => {
    const log = { feedItemId: 'i1', feedQuantity: 45 };
    expect(normalizedConsumedItems(log)).toEqual([{ itemId: 'i1', quantity: 45 }]);
  });

  it('falls back to the even older feedKg field when feedQuantity is absent', () => {
    const log = { feedItemId: 'i1', feedKg: 30 };
    expect(normalizedConsumedItems(log)).toEqual([{ itemId: 'i1', quantity: 30 }]);
  });

  it('merges a repeated itemId into one entry rather than producing a colliding duplicate', () => {
    const log = { consumedItems: [{ itemId: 'i1', quantity: 20 }, { itemId: 'i1', quantity: 15 }] };
    expect(normalizedConsumedItems(log)).toEqual([{ itemId: 'i1', quantity: 35 }]);
  });

  it('ignores entries with no itemId or a non-positive quantity', () => {
    const log = { consumedItems: [{ itemId: null, quantity: 10 }, { itemId: 'i1', quantity: 0 }, { itemId: 'i2', quantity: 5 }] };
    expect(normalizedConsumedItems(log)).toEqual([{ itemId: 'i2', quantity: 5 }]);
  });

  it('returns an empty array when the log records no stock use at all', () => {
    expect(normalizedConsumedItems({ id: 'l1', unitId: 'u1' })).toEqual([]);
  });
});

describe('buildFeedTransactions', () => {
  it('builds a consumption transaction for a single legacy-style item', () => {
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    const result = buildFeedTransactions(log, units);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'logfeed_l1_i1',
      itemId: 'i1',
      direction: 'out',
      quantity: 45,
      unitId: 'u1',
      source: 'daily-log',
      sourceId: 'l1',
    });
  });

  it('builds one transaction per distinct item for a multi-item log', () => {
    const log = {
      id: 'l1', unitId: 'u1', date: '2026-08-18',
      consumedItems: [{ itemId: 'i1', quantity: 45 }, { itemId: 'i2', quantity: 3 }],
    };
    const result = buildFeedTransactions(log, units);
    expect(result).toHaveLength(2);
    expect(result.find((t) => t.itemId === 'i1').quantity).toBe(45);
    expect(result.find((t) => t.itemId === 'i2').quantity).toBe(3);
  });

  it('returns an empty array when no feed item or quantity was set', () => {
    expect(buildFeedTransactions({ id: 'l1', unitId: 'u1' }, units)).toEqual([]);
    expect(buildFeedTransactions({ id: 'l1', unitId: 'u1', feedItemId: 'i1', feedQuantity: 0 }, units)).toEqual([]);
  });
});

describe('checkFeedAvailability', () => {
  it('allows consumption within available stock', () => {
    const inventory = [{ id: 'i1', openingStock: 50 }];
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    expect(checkFeedAvailability(log, units, inventory, []).ok).toBe(true);
  });

  it('rejects consumption exceeding available stock, reporting the shortfall', () => {
    const inventory = [{ id: 'i1', name: 'Layer Mash', unit: 'kg', openingStock: 10 }];
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    const check = checkFeedAvailability(log, units, inventory, []);
    expect(check.ok).toBe(false);
    expect(check.available).toBe(10);
    expect(check.itemName).toBe('Layer Mash');
  });

  it('is a no-op when the log does not track feed at all', () => {
    expect(checkFeedAvailability({ id: 'l1', unitId: 'u1' }, units, [], []).ok).toBe(true);
  });

  it('checks each item in a multi-item log independently, reporting the first shortfall', () => {
    const inventory = [
      { id: 'i1', name: 'Layer Mash', unit: 'kg', openingStock: 100 },
      { id: 'i2', name: 'Dewormer', unit: 'ml', openingStock: 5 },
    ];
    const log = {
      id: 'l1', unitId: 'u1', date: '2026-08-18',
      consumedItems: [{ itemId: 'i1', quantity: 20 }, { itemId: 'i2', quantity: 50 }],
    };
    const check = checkFeedAvailability(log, units, inventory, []);
    expect(check.ok).toBe(false);
    expect(check.itemName).toBe('Dewormer');
    expect(check.available).toBe(5);
  });

  it('passes when every item in a multi-item log has enough stock', () => {
    const inventory = [
      { id: 'i1', name: 'Layer Mash', unit: 'kg', openingStock: 100 },
      { id: 'i2', name: 'Dewormer', unit: 'ml', openingStock: 50 },
    ];
    const log = {
      id: 'l1', unitId: 'u1', date: '2026-08-18',
      consumedItems: [{ itemId: 'i1', quantity: 20 }, { itemId: 'i2', quantity: 30 }],
    };
    expect(checkFeedAvailability(log, units, inventory, []).ok).toBe(true);
  });
});

describe('syncedTransactionsForLog', () => {
  it('adds a consumption transaction for newly logged feed', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 50 }];
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    const result = syncedTransactionsForLog(log, units, inventory, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'logfeed_l1_i1', quantity: 45, direction: 'out' });
  });

  it('adds one transaction per item for a multi-item log', () => {
    const inventory = [
      { id: 'i1', unit: 'kg', openingStock: 50 },
      { id: 'i2', unit: 'ml', openingStock: 20 },
    ];
    const log = {
      id: 'l1', unitId: 'u1', date: '2026-08-18',
      consumedItems: [{ itemId: 'i1', quantity: 30 }, { itemId: 'i2', quantity: 10 }],
    };
    const result = syncedTransactionsForLog(log, units, inventory, []);
    expect(result).toHaveLength(2);
    expect(result.find((t) => t.itemId === 'i1').quantity).toBe(30);
    expect(result.find((t) => t.itemId === 'i2').quantity).toBe(10);
  });

  it('replaces the previous transaction on edit rather than duplicating it', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 50 }];
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    const first = syncedTransactionsForLog(log, units, inventory, []);
    const second = syncedTransactionsForLog({ ...log, feedQuantity: 30 }, units, inventory, first);
    expect(second).toHaveLength(1);
    expect(second[0].quantity).toBe(30);
  });

  it('replaces a whole multi-item set cleanly on edit — no leftover transactions from items dropped in the edit', () => {
    const inventory = [
      { id: 'i1', unit: 'kg', openingStock: 50 },
      { id: 'i2', unit: 'ml', openingStock: 20 },
    ];
    const log = {
      id: 'l1', unitId: 'u1', date: '2026-08-18',
      consumedItems: [{ itemId: 'i1', quantity: 30 }, { itemId: 'i2', quantity: 10 }],
    };
    const first = syncedTransactionsForLog(log, units, inventory, []);
    // Edited to drop item i2 entirely and change i1's quantity.
    const edited = { ...log, consumedItems: [{ itemId: 'i1', quantity: 25 }] };
    const second = syncedTransactionsForLog(edited, units, inventory, first);
    expect(second).toHaveLength(1);
    expect(second[0].itemId).toBe('i1');
    expect(second[0].quantity).toBe(25);
  });

  it('leaves the old transaction in place if the edit would over-consume', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 50 }];
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    const first = syncedTransactionsForLog(log, units, inventory, []);
    const second = syncedTransactionsForLog({ ...log, feedQuantity: 1000 }, units, inventory, first);
    expect(second).toBe(first);
  });

  it('rejects the whole multi-item set together if any single item in it would over-consume', () => {
    const inventory = [
      { id: 'i1', unit: 'kg', openingStock: 50 },
      { id: 'i2', unit: 'ml', openingStock: 5 },
    ];
    const log = {
      id: 'l1', unitId: 'u1', date: '2026-08-18',
      // i1 is well within stock, but i2 asks for far more than exists —
      // neither should be applied.
      consumedItems: [{ itemId: 'i1', quantity: 10 }, { itemId: 'i2', quantity: 500 }],
    };
    const result = syncedTransactionsForLog(log, units, inventory, []);
    expect(result).toEqual([]);
  });

  it('removes the transaction entirely if feed tracking is cleared from the log', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 50 }];
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    const first = syncedTransactionsForLog(log, units, inventory, []);
    const second = syncedTransactionsForLog({ ...log, feedItemId: null, feedQuantity: 0 }, units, inventory, first);
    expect(second).toHaveLength(0);
  });
});
