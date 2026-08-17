import { describe, it, expect } from 'vitest';
import { buildFeedTransaction, checkFeedAvailability, syncedTransactionsForLog } from '../../src/lib/feedLinking.js';

const units = [{ id: 'u1', name: 'Layer House A' }];

describe('buildFeedTransaction', () => {
  it('builds a consumption transaction when feed was logged', () => {
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    expect(buildFeedTransaction(log, units)).toMatchObject({
      id: 'logfeed_l1',
      itemId: 'i1',
      direction: 'out',
      quantity: 45,
      unitId: 'u1',
      source: 'daily-log',
      sourceId: 'l1',
    });
  });

  it('returns null when no feed item or quantity was set', () => {
    expect(buildFeedTransaction({ id: 'l1', unitId: 'u1' }, units)).toBeNull();
    expect(buildFeedTransaction({ id: 'l1', unitId: 'u1', feedItemId: 'i1', feedQuantity: 0 }, units)).toBeNull();
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
});

describe('syncedTransactionsForLog', () => {
  it('adds a consumption transaction for newly logged feed', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 50 }];
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    const result = syncedTransactionsForLog(log, units, inventory, []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'logfeed_l1', quantity: 45, direction: 'out' });
  });

  it('replaces the previous transaction on edit rather than duplicating it', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 50 }];
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    const first = syncedTransactionsForLog(log, units, inventory, []);
    const second = syncedTransactionsForLog({ ...log, feedQuantity: 30 }, units, inventory, first);
    expect(second).toHaveLength(1);
    expect(second[0].quantity).toBe(30);
  });

  it('leaves the old transaction in place if the edit would over-consume', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 50 }];
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    const first = syncedTransactionsForLog(log, units, inventory, []);
    const second = syncedTransactionsForLog({ ...log, feedQuantity: 1000 }, units, inventory, first);
    expect(second).toBe(first);
  });

  it('removes the transaction entirely if feed tracking is cleared from the log', () => {
    const inventory = [{ id: 'i1', unit: 'kg', openingStock: 50 }];
    const log = { id: 'l1', unitId: 'u1', date: '2026-08-18', feedItemId: 'i1', feedQuantity: 45 };
    const first = syncedTransactionsForLog(log, units, inventory, []);
    const second = syncedTransactionsForLog({ ...log, feedItemId: null, feedQuantity: 0 }, units, inventory, first);
    expect(second).toHaveLength(0);
  });
});
